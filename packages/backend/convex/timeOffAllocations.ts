import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMinRole, requireUser } from "./lib/rbac";

// ─── Queries ────────────────────────────────────────────────────────────────

// Employee balance view (own balance)
export const balance = query({
  args: {
    clerkId: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const employeeId = user.employeeId;

    if (!employeeId) {
      return [];
    }

    const targetYear = args.year ?? new Date().getFullYear();

    const allocations = await ctx.db
      .query("timeOffAllocations")
      .withIndex("by_employee_year", (q) =>
        q.eq("employeeId", employeeId).eq("year", targetYear)
      )
      .collect();

    const balances = await Promise.all(
      allocations.map(async (a) => {
        const type = await ctx.db.get(a.timeOffTypeId);
        return {
          _id: a._id,
          adjustedDays: a.adjustedDays,
          allocated: a.allocatedAmount,
          remaining: a.allocatedAmount + a.adjustedDays - a.takenAmount,
          status: a.status,
          taken: a.takenAmount,
          typeName: type?.name ?? "Unknown",
          unit: type?.unit ?? "days",
          year: a.year,
        };
      })
    );

    return balances.filter((b) => b.status === "active");
  },
});

// HR/Admin: view any employee's balance
export const balanceForEmployee = query({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.id("employees"),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    const targetYear = args.year ?? new Date().getFullYear();

    const allocations = await ctx.db
      .query("timeOffAllocations")
      .withIndex("by_employee_year", (q) =>
        q.eq("employeeId", args.employeeId).eq("year", targetYear)
      )
      .collect();

    const balances = await Promise.all(
      allocations.map(async (a) => {
        const type = await ctx.db.get(a.timeOffTypeId);
        return {
          _id: a._id,
          adjustedDays: a.adjustedDays,
          allocated: a.allocatedAmount,
          remaining: a.allocatedAmount + a.adjustedDays - a.takenAmount,
          status: a.status,
          taken: a.takenAmount,
          typeName: type?.name ?? "Unknown",
          unit: type?.unit ?? "days",
          year: a.year,
        };
      })
    );

    return balances.filter((b) => b.status === "active");
  },
});

// List all allocations (HR+ see all, employees see own)
export const list = query({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    const targetYear = args.year ?? new Date().getFullYear();
    let employeeId = args.employeeId;

    if (user.role === "employee") {
      employeeId = user.employeeId;
    }

    if (employeeId) {
      const allocations = await ctx.db
        .query("timeOffAllocations")
        .withIndex("by_employee_year", (q) =>
          q.eq("employeeId", employeeId!).eq("year", targetYear)
        )
        .collect();

      return Promise.all(
        allocations.map(async (a) => {
          const type = await ctx.db.get(a.timeOffTypeId);
          const emp = await ctx.db.get(a.employeeId);
          return {
            ...a,
            employeeName: emp?.name,
            remaining: a.allocatedAmount + a.adjustedDays - a.takenAmount,
            typeName: type?.name,
            unit: type?.unit,
          };
        })
      );
    }

    const all = await ctx.db.query("timeOffAllocations").collect();
    const filtered = all.filter((a) => a.year === targetYear);

    return Promise.all(
      filtered.map(async (a) => {
        const type = await ctx.db.get(a.timeOffTypeId);
        const emp = await ctx.db.get(a.employeeId);
        return {
          ...a,
          employeeName: emp?.name,
          remaining: a.allocatedAmount + a.adjustedDays - a.takenAmount,
          typeName: type?.name,
          unit: type?.unit,
        };
      })
    );
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

// Create an allocation (HR Manager+)
export const create = mutation({
  args: {
    allocatedAmount: v.number(),
    clerkId: v.optional(v.string()),
    employeeId: v.id("employees"),
    timeOffTypeId: v.id("timeOffTypes"),
    validFrom: v.number(),
    validTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    if (args.allocatedAmount <= 0) {
      throw new Error("Allocated amount must be positive");
    }

    const type = await ctx.db.get(args.timeOffTypeId);
    if (!type) {
      throw new Error("Time-off type not found");
    }

    const emp = await ctx.db.get(args.employeeId);
    if (!emp) {
      throw new Error("Employee not found");
    }

    const year = new Date(args.validFrom).getFullYear();

    const existing = await ctx.db
      .query("timeOffAllocations")
      .withIndex("by_employee_type", (q) =>
        q
          .eq("employeeId", args.employeeId)
          .eq("timeOffTypeId", args.timeOffTypeId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existing) {
      throw new Error(
        `Employee already has an active allocation for "${type.name}" in ${year}. Update the existing one instead.`
      );
    }

    return await ctx.db.insert("timeOffAllocations", {
      adjustedDays: 0,
      allocatedAmount: args.allocatedAmount,
      employeeId: args.employeeId,
      status: "active",
      takenAmount: 0,
      timeOffTypeId: args.timeOffTypeId,
      validFrom: args.validFrom,
      validTo: args.validTo,
      year,
    });
  },
});

// Update an allocation (HR Manager+)
export const update = mutation({
  args: {
    allocatedAmount: v.number(),
    clerkId: v.optional(v.string()),
    id: v.id("timeOffAllocations"),
    validTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    if (args.allocatedAmount <= 0) {
      throw new Error("Allocated amount must be positive");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Allocation not found");
    }

    if (args.allocatedAmount < existing.takenAmount) {
      throw new Error(
        `Cannot reduce below taken amount (${existing.takenAmount})`
      );
    }

    await ctx.db.patch(args.id, {
      allocatedAmount: args.allocatedAmount,
      validTo: args.validTo,
    });
  },
});

// Adjust balance (HR Manager+) — records audit trail
export const adjust = mutation({
  args: {
    adjustment: v.number(),
    allocationId: v.id("timeOffAllocations"),
    clerkId: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireMinRole(ctx, "hr_manager", args.clerkId);

    if (!args.reason.trim()) {
      throw new Error("Adjustment reason is required");
    }

    const allocation = await ctx.db.get(args.allocationId);
    if (!allocation) {
      throw new Error("Allocation not found");
    }

    const newAdjusted = allocation.adjustedDays + args.adjustment;
    const totalAvailable = allocation.allocatedAmount + newAdjusted;
    if (totalAvailable < allocation.takenAmount) {
      throw new Error(
        `Adjustment would result in negative balance. Current taken: ${allocation.takenAmount}, would be available: ${totalAvailable}`
      );
    }

    await ctx.db.patch(args.allocationId, {
      adjustedDays: newAdjusted,
    });

    // Record audit trail
    await ctx.db.insert("leaveBalanceAdjustments", {
      adjustedBy: user._id,
      adjustment: args.adjustment,
      allocationId: args.allocationId,
      employeeId: allocation.employeeId,
      previousAdjustedDays: allocation.adjustedDays,
      reason: args.reason.trim(),
      timeOffTypeId: allocation.timeOffTypeId,
    });
  },
});

// Delete an allocation (HR Manager+)
export const remove = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("timeOffAllocations"),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Allocation not found");
    }

    if (existing.takenAmount > 0) {
      throw new Error(
        "Cannot delete allocation with used days. Delete associated requests first."
      );
    }

    await ctx.db.delete(args.id);
  },
});
