import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireMinRole, requireUser } from "./lib/rbac";

export const employeeStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("terminated")
);

export const employeeTypeValidator = v.union(
  v.literal("full_time"),
  v.literal("part_time"),
  v.literal("contract")
);

export const bankDetailsValidator = v.object({
  accountName: v.string(),
  accountNumber: v.string(),
  ifsc: v.string(),
});

export const list = query({
  args: {
    clerkId: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    // Employee cannot see other employees; return only own record
    if (user.role === "employee") {
      if (!user.employeeId) {
        return [];
      }
      const self = await ctx.db.get(user.employeeId);
      if (!self) {
        return [];
      }
      const dept = await ctx.db.get(self.departmentId);
      return [
        {
          ...self,
          departmentName: dept?.name,
          linkedUserEmail: user.email,
          linkedUserId: user._id,
          linkedUserRole: user.role,
          managerName: undefined,
        },
      ];
    }

    let employees = await ctx.db.query("employees").collect();

    if (args.status && args.status !== "all") {
      employees = employees.filter((e) => e.status === args.status);
    }

    if (args.departmentId) {
      employees = employees.filter((e) => e.departmentId === args.departmentId);
    }

    // Batch lookups — avoid N+1 queries
    const deptIds = [...new Set(employees.map((e) => e.departmentId))];
    const managerIds = [
      ...new Set(employees.map((e) => e.managerId).filter(Boolean)),
    ];

    const [departments, managers, allUsers] = await Promise.all([
      Promise.all(deptIds.map((id) => ctx.db.get(id))),
      Promise.all(managerIds.map((id) => ctx.db.get(id!))),
      ctx.db.query("users").collect(),
    ]);

    const deptMap = new Map(deptIds.map((id, i) => [id, departments[i]?.name]));
    const managerMap = new Map(
      managerIds.map((id, i) => [id, managers[i]?.name])
    );
    const userByEmpId = new Map(
      allUsers.filter((u) => u.employeeId).map((u) => [u.employeeId, u])
    );

    const enhanced = employees.map((e) => {
      const linkedUser = userByEmpId.get(e._id);
      return {
        ...e,
        departmentName: deptMap.get(e.departmentId),
        linkedUserEmail: linkedUser?.email,
        linkedUserId: linkedUser?._id,
        linkedUserRole: linkedUser?.role ?? "employee",
        managerName: e.managerId ? managerMap.get(e.managerId) : undefined,
      };
    });

    // Role-based visibility in Employee list
    let filtered = enhanced;
    if (user.role === "hr_manager") {
      filtered = enhanced.filter((e) => e.linkedUserRole === "employee");
    } else if (user.role === "hr_payroll_user") {
      filtered = enhanced.filter((e) =>
        ["employee", "hr_manager"].includes(e.linkedUserRole)
      );
    } else if (user.role === "hr_payroll_manager") {
      filtered = enhanced.filter((e) =>
        ["employee", "hr_manager", "hr_payroll_user"].includes(e.linkedUserRole)
      );
    }

    if (args.search) {
      const q = args.search.toLowerCase().trim();
      return filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.jobPosition.toLowerCase().includes(q) ||
          (e.departmentName && e.departmentName.toLowerCase().includes(q))
      );
    }

    return filtered;
  },
});

/**
 * Unfiltered employee list — returns ALL employees regardless of caller role.
 * Used for manager dropdowns, linking UIs, and admin screens.
 */
export const listAll = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx) => {
    const employees = await ctx.db.query("employees").collect();

    // Batch department lookup
    const deptIds = [...new Set(employees.map((e) => e.departmentId))];
    const depts = await Promise.all(deptIds.map((id) => ctx.db.get(id)));
    const deptMap = new Map(deptIds.map((id, i) => [id, depts[i]?.name]));

    return employees.map((e) => ({
      ...e,
      departmentName: deptMap.get(e.departmentId),
    }));
  },
});

export const get = query({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("employees"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    // If regular employee, only allow viewing their own record
    if (user.role === "employee" && user.employeeId !== args.id) {
      throw new Error("Forbidden: Access limited to own employee record");
    }

    const employee = await ctx.db.get(args.id);
    if (!employee) {
      return null;
    }

    const dept = await ctx.db.get(employee.departmentId);
    const manager = employee.managerId
      ? await ctx.db.get(employee.managerId)
      : null;
    const schedule = employee.scheduleId
      ? await ctx.db.get(employee.scheduleId)
      : null;

    const linkedUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("employeeId"), employee._id))
      .first();

    const canEditWorkDetails =
      user.role === "admin" ||
      user.role === "hr_payroll_manager" ||
      user.role === "hr_payroll_user" ||
      user.role === "hr_manager";

    const isSelf = user.employeeId === employee._id;
    const canEditPrivateDetails =
      isSelf ||
      ["admin", "hr_manager", "hr_payroll_user", "hr_payroll_manager"].includes(
        user.role
      );

    return {
      ...employee,
      canEditPrivateDetails,
      canEditWorkDetails,
      departmentName: dept?.name,
      isSelf,
      linkedUserEmail: linkedUser?.email,
      linkedUserRole: linkedUser?.role,
      managerName: manager?.name,
      scheduleName: schedule?.name,
    };
  },
});

export const getSmartStats = query({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.id("employees"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    if (user.role === "employee" && user.employeeId !== args.employeeId) {
      throw new Error("Forbidden: Access limited to own employee record");
    }

    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_employee_start", (q) =>
        q.eq("employeeId", args.employeeId)
      )
      .collect();

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", (q) => q.eq("employeeId", args.employeeId))
      .collect();

    const timeOff = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();

    const allocations = await ctx.db
      .query("timeOffAllocations")
      .filter((q) => q.eq(q.field("employeeId"), args.employeeId))
      .collect();

    return {
      allocationsCount: allocations.length,
      attendanceCount: attendance.length,
      contractsCount: contracts.length,
      timeOffCount: timeOff.length,
    };
  },
});

export const create = mutation({
  args: {
    address: v.optional(v.string()),
    bankDetails: v.optional(bankDetailsValidator),
    clerkId: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    departmentId: v.id("departments"),
    email: v.string(),
    emergencyContact: v.optional(v.string()),
    employeeType: employeeTypeValidator,
    jobPosition: v.string(),
    managerId: v.optional(v.id("employees")),
    name: v.string(),
    phone: v.optional(v.string()),
    scheduleId: v.optional(v.id("workingSchedules")),
    status: employeeStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    return await ctx.db.insert("employees", args);
  },
});

// Update Work Details: HR Manager+
export const updateWorkDetails = mutation({
  args: {
    clerkId: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    email: v.optional(v.string()),
    employeeType: v.optional(employeeTypeValidator),
    id: v.id("employees"),
    jobPosition: v.optional(v.string()),
    managerId: v.optional(v.id("employees")),
    name: v.optional(v.string()),
    scheduleId: v.optional(v.id("workingSchedules")),
    status: v.optional(employeeStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    const target = await ctx.db.get(args.id);
    if (!target) {
      throw new Error("Employee not found");
    }

    const { id, ...patchData } = args;
    await ctx.db.patch(id, patchData);
  },
});

// Update Private Details: ONLY the employee themselves or Admin can edit
export const updatePrivateDetails = mutation({
  args: {
    address: v.optional(v.string()),
    bankDetails: v.optional(bankDetailsValidator),
    clerkId: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    id: v.id("employees"),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const target = await ctx.db.get(args.id);
    if (!target) {
      throw new Error("Employee not found");
    }

    const isSelf = user.employeeId === target._id;
    const canEditPrivate =
      user.role === "admin" ||
      user.role === "hr_manager" ||
      user.role === "hr_payroll_user" ||
      user.role === "hr_payroll_manager";

    if (!(isSelf || canEditPrivate)) {
      throw new Error(
        "Forbidden: Private details can only be edited by the employee or HR."
      );
    }

    const { id, ...patchData } = args;
    await ctx.db.patch(id, patchData);
  },
});

export const update = mutation({
  args: {
    address: v.optional(v.string()),
    bankDetails: v.optional(bankDetailsValidator),
    clerkId: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    email: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    employeeType: v.optional(employeeTypeValidator),
    id: v.id("employees"),
    jobPosition: v.optional(v.string()),
    managerId: v.optional(v.id("employees")),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    scheduleId: v.optional(v.id("workingSchedules")),
    status: v.optional(employeeStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    const { id, ...patchData } = args;
    await ctx.db.patch(id, patchData);
  },
});

export const remove = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("employees"),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    // Check if employee has active contracts
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_employee_start", (q) => q.eq("employeeId", args.id))
      .collect();

    if (contracts.some((c) => c.status === "active")) {
      throw new Error(
        "Cannot delete employee with active contracts. Mark as terminated or cancel contracts first."
      );
    }

    await ctx.db.delete(args.id);
  },
});
