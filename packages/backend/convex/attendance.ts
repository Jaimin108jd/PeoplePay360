import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireMinRole, requireUser } from "./lib/rbac";

export const attendanceStatusValidator = v.union(
  v.literal("present"),
  v.literal("late"),
  v.literal("absent"),
  v.literal("exception"),
  v.literal("overtime"),
  v.literal("paid_leave"),
  v.literal("unpaid_leave"),
  v.literal("scheduled_off")
);

async function getScheduledBreakMinutes(
  ctx: MutationCtx,
  employeeId: Id<"employees">,
  date: string
) {
  const employee = await ctx.db.get(employeeId);
  if (!employee?.scheduleId) {
    return 0;
  }
  const scheduleDay = await ctx.db
    .query("scheduleDays")
    .withIndex("by_schedule", (q) => q.eq("scheduleId", employee.scheduleId!))
    .filter((q) =>
      q.eq(q.field("dayOfWeek"), new Date(`${date}T00:00:00`).getDay())
    )
    .first();
  return scheduleDay?.breakMinutes ?? 0;
}

async function computeWorkedMinutes(
  ctx: MutationCtx,
  employeeId: Id<"employees">,
  date: string,
  checkIn?: number,
  checkOut?: number
) {
  if (checkIn === undefined || checkOut === undefined) {
    return 0;
  }
  const breakMinutes = await getScheduledBreakMinutes(ctx, employeeId, date);
  return Math.max(0, Math.round((checkOut - checkIn) / 60_000) - breakMinutes);
}

// Hierarchy: users you can see are those with a LOWER role level.
const ROLE_LEVEL: Record<string, number> = {
  admin: 5,
  employee: 1,
  hr_manager: 2,
  hr_payroll_manager: 4,
  hr_payroll_user: 3,
};

async function getVisibleEmployeeIds(
  ctx: QueryCtx | MutationCtx,
  callerRole: string
): Promise<Id<"employees">[]> {
  if (callerRole === "employee") {
    return [];
  }

  const callerLevel = ROLE_LEVEL[callerRole] ?? 0;

  const allUsers = await ctx.db.query("users").collect();
  const visibleEmployeeIds: Id<"employees">[] = [];

  for (const u of allUsers) {
    const userLevel = ROLE_LEVEL[u.role] ?? 0;
    if (userLevel < callerLevel && u.employeeId) {
      visibleEmployeeIds.push(u.employeeId);
    }
  }

  return visibleEmployeeIds;
}

export const list = query({
  args: {
    clerkId: v.optional(v.string()),
    date: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    let effectiveEmployeeId = args.employeeId;

    if (user.role === "employee") {
      if (!user.employeeId) {
        return [];
      }
      effectiveEmployeeId = user.employeeId;
    } else if (!effectiveEmployeeId) {
      // HR+ viewing all: get only employees below their level
      const visibleIds = await getVisibleEmployeeIds(ctx, user.role);
      if (visibleIds.length === 0) {
        return [];
      }

      const allRecords = await ctx.db.query("attendance").collect();
      const visibleSet = new Set(visibleIds.map((id) => id));
      let records = allRecords.filter((r) => visibleSet.has(r.employeeId));

      if (args.date) {
        records = records.filter((r) => r.date === args.date);
      }
      if (args.status && args.status !== "all") {
        records = records.filter((r) => r.status === args.status);
      }

      const enhanced = await Promise.all(
        records.map(async (r) => {
          const emp = await ctx.db.get(r.employeeId);
          const dept = emp ? await ctx.db.get(emp.departmentId) : null;
          const corrector = r.correctedBy
            ? await ctx.db.get(r.correctedBy)
            : null;
          return {
            ...r,
            correctedByEmail: corrector?.email,
            departmentName: dept?.name,
            employeeJob: emp?.jobPosition,
            employeeName: emp?.name,
          };
        })
      );

      return enhanced.sort((a, b) => b.date.localeCompare(a.date));
    }

    // Single employee view
    let records = effectiveEmployeeId
      ? await ctx.db
          .query("attendance")
          .withIndex("by_employee_date", (q) =>
            q.eq("employeeId", effectiveEmployeeId!)
          )
          .collect()
      : await ctx.db.query("attendance").collect();

    if (args.date) {
      records = records.filter((r) => r.date === args.date);
    }

    if (args.status && args.status !== "all") {
      records = records.filter((r) => r.status === args.status);
    }

    const enhanced = await Promise.all(
      records.map(async (r) => {
        const emp = await ctx.db.get(r.employeeId);
        const dept = emp ? await ctx.db.get(emp.departmentId) : null;
        const corrector = r.correctedBy
          ? await ctx.db.get(r.correctedBy)
          : null;

        return {
          ...r,
          correctedByEmail: corrector?.email,
          departmentName: dept?.name,
          employeeJob: emp?.jobPosition,
          employeeName: emp?.name,
        };
      })
    );

    return enhanced.sort((a, b) => b.date.localeCompare(a.date));
  },
});

async function materializeDailyRecords(ctx: MutationCtx, date: string) {
  const employees = await ctx.db
    .query("employees")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .collect();
  const createdIds = [];
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

  for (const employee of employees) {
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", employee._id).eq("date", date)
      )
      .unique();
    if (existing) {
      continue;
    }

    const approvedLeave = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "approved"),
          q.lte(q.field("startDate"), new Date(`${date}T23:59:59`).getTime()),
          q.gte(q.field("endDate"), new Date(`${date}T00:00:00`).getTime())
        )
      )
      .first();

    let status: "absent" | "paid_leave" | "unpaid_leave" | "scheduled_off" =
      "absent";
    if (approvedLeave) {
      const type = await ctx.db.get(approvedLeave.timeOffTypeId);
      status = type?.isPaid ? "paid_leave" : "unpaid_leave";
    } else if (employee.scheduleId) {
      const scheduleDay = await ctx.db
        .query("scheduleDays")
        .withIndex("by_schedule", (q) =>
          q.eq("scheduleId", employee.scheduleId!)
        )
        .filter((q) => q.eq(q.field("dayOfWeek"), dayOfWeek))
        .first();
      if (!scheduleDay) {
        status = "scheduled_off";
      }
    } else {
      status = "scheduled_off";
    }

    createdIds.push(
      await ctx.db.insert("attendance", {
        date,
        employeeId: employee._id,
        status,
        workedMinutes: 0,
      })
    );
  }

  return { created: createdIds.length };
}

export const ensureDailyRecords = mutation({
  args: {
    clerkId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    return await materializeDailyRecords(ctx, args.date);
  },
});

export const ensureDailyRecordsInternal = internalMutation({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx) => {
    const date = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
    return await materializeDailyRecords(ctx, date);
  },
});

export const getTodayStatus = query({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const targetEmpId = args.employeeId ?? user.employeeId;

    if (!targetEmpId) {
      return null;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const record = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", targetEmpId).eq("date", todayStr)
      )
      .unique();

    return record;
  },
});

export const checkIn = mutation({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const targetEmpId = args.employeeId ?? user.employeeId;

    if (!targetEmpId) {
      throw new Error("No employee profile linked to this user account.");
    }

    if (user.role === "employee" && user.employeeId !== targetEmpId) {
      throw new Error("Forbidden: Can only check in for your own profile.");
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", targetEmpId).eq("date", todayStr)
      )
      .unique();

    if (existing && existing.checkIn) {
      throw new Error("Already checked in today.");
    }

    const now = Date.now();
    const currentHour = new Date(now).getHours();
    const status = currentHour >= 10 ? "late" : "present";

    if (existing) {
      await ctx.db.patch(existing._id, {
        checkIn: now,
        status,
      });
      return existing._id;
    }

    return await ctx.db.insert("attendance", {
      checkIn: now,
      date: todayStr,
      employeeId: targetEmpId,
      status,
      workedMinutes: 0,
    });
  },
});

export const checkOut = mutation({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const targetEmpId = args.employeeId ?? user.employeeId;

    if (!targetEmpId) {
      throw new Error("No employee profile linked.");
    }

    if (user.role === "employee" && user.employeeId !== targetEmpId) {
      throw new Error("Forbidden: Can only check out for your own profile.");
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", targetEmpId).eq("date", todayStr)
      )
      .unique();

    if (!(existing && existing.checkIn)) {
      throw new Error("Cannot check out without an active check-in today.");
    }

    const now = Date.now();
    const workedMinutes = await computeWorkedMinutes(
      ctx,
      targetEmpId,
      todayStr,
      existing.checkIn,
      now
    );

    let status = existing.status;
    if (workedMinutes >= 540) {
      status = "overtime";
    } else if (workedMinutes < 240) {
      status = "exception";
    }

    await ctx.db.patch(existing._id, {
      checkOut: now,
      status,
      workedMinutes,
    });

    return existing._id;
  },
});

export const recordManual = mutation({
  args: {
    checkInTime: v.optional(v.string()),
    checkOutTime: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    date: v.string(),
    employeeId: v.id("employees"),
    status: attendanceStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date)
      )
      .unique();

    let checkIn: number | undefined;
    let checkOut: number | undefined;
    let workedMinutes = 0;

    if (args.checkInTime) {
      checkIn = new Date(`${args.date}T${args.checkInTime}:00`).getTime();
    }
    if (args.checkOutTime) {
      checkOut = new Date(`${args.date}T${args.checkOutTime}:00`).getTime();
    }

    if (checkIn && checkOut) {
      workedMinutes = await computeWorkedMinutes(
        ctx,
        args.employeeId,
        args.date,
        checkIn,
        checkOut
      );
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        checkIn,
        checkOut,
        status: args.status,
        workedMinutes,
      });
      return existing._id;
    }

    return await ctx.db.insert("attendance", {
      checkIn,
      checkOut,
      date: args.date,
      employeeId: args.employeeId,
      status: args.status,
      workedMinutes,
    });
  },
});

export const correctAttendance = mutation({
  args: {
    checkInTime: v.optional(v.string()),
    checkOutTime: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    id: v.id("attendance"),
    status: attendanceStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireMinRole(ctx, "hr_manager", args.clerkId);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Attendance record not found");
    }

    let checkIn = existing.checkIn;
    let checkOut = existing.checkOut;
    let workedMinutes = existing.workedMinutes;

    if (args.checkInTime) {
      checkIn = new Date(`${existing.date}T${args.checkInTime}:00`).getTime();
    }
    if (args.checkOutTime) {
      checkOut = new Date(`${existing.date}T${args.checkOutTime}:00`).getTime();
    }

    if (checkIn && checkOut) {
      workedMinutes = await computeWorkedMinutes(
        ctx,
        existing.employeeId,
        existing.date,
        checkIn,
        checkOut
      );
    }

    await ctx.db.patch(args.id, {
      checkIn,
      checkOut,
      correctedBy: user._id,
      status: args.status,
      workedMinutes,
    });
  },
});
