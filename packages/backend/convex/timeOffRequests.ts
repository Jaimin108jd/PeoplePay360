import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireMinRole, requireUser } from "./lib/rbac";
import {
  calculateLeaveDays,
  hasOverlap,
  isDuplicate,
  isInvalidDateRange,
  isPastDate,
} from "./lib/timeOffCalculation";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Record an action in the audit history */
async function recordHistory(
  ctx: MutationCtx,
  args: {
    action:
      | "cancelled"
      | "request_created"
      | "approved"
      | "refused"
      | "balance_adjusted";
    comment?: string;
    newStatus: string;
    performedBy: Id<"users">;
    previousStatus?: string;
    timeOffRequestId: Id<"timeOffRequests">;
  }
) {
  return await ctx.db.insert("timeOffActionHistory", {
    action: args.action,
    comment: args.comment,
    newStatus: args.newStatus,
    performedBy: args.performedBy,
    previousStatus: args.previousStatus,
    timeOffRequestId: args.timeOffRequestId,
  });
}

/** Consume from allocation when request is approved (§8.3) */
async function consumeAllocation(
  ctx: MutationCtx,
  allocationId: Id<"timeOffAllocations">,
  duration: number
) {
  const allocation = await ctx.db.get(allocationId);
  if (!allocation) {
    throw new Error("Allocation not found");
  }

  const available =
    allocation.allocatedAmount +
    allocation.adjustedDays -
    allocation.takenAmount;
  if (available < duration) {
    throw new Error(
      `Insufficient balance: ${available} remaining, ${duration} requested`
    );
  }

  await ctx.db.patch(allocationId, {
    takenAmount: allocation.takenAmount + duration,
  });

  return allocation;
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Get a single request with full context */
export const get = query({
  args: {
    clerkId: v.optional(v.string()),
    requestId: v.id("timeOffRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    const emp = await ctx.db.get(request.employeeId);
    const dept = emp ? await ctx.db.get(emp.departmentId) : null;
    const type = await ctx.db.get(request.timeOffTypeId);
    const processor = request.processedBy
      ? await ctx.db.get(request.processedBy)
      : null;

    const history = await ctx.db
      .query("timeOffActionHistory")
      .withIndex("by_request", (q) => q.eq("timeOffRequestId", args.requestId))
      .collect();

    const historyWithActors = await Promise.all(
      history.map(async (h) => {
        const actor = await ctx.db.get(h.performedBy);
        return { ...h, actorEmail: actor?.email };
      })
    );

    return {
      ...request,
      departmentName: dept?.name,
      employeeEmail: emp?.email,
      employeeName: emp?.name,
      employeePosition: emp?.jobPosition,
      history: historyWithActors.sort(
        (a, b) => a._creationTime - b._creationTime
      ),
      processorEmail: processor?.email,
      typeName: type?.name,
      unit: type?.unit,
    };
  },
});

/** List requests — employees see own, HR+ see all below their level */
export const list = query({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    let targetEmployeeId = args.employeeId;
    if (user.role === "employee") {
      targetEmployeeId = user.employeeId;
    }

    let requests;
    if (targetEmployeeId) {
      requests = await ctx.db
        .query("timeOffRequests")
        .withIndex("by_employee", (q) => q.eq("employeeId", targetEmployeeId!))
        .collect();
    } else {
      requests = await ctx.db.query("timeOffRequests").collect();
    }

    if (args.status && args.status !== "all") {
      requests = requests.filter((r) => r.status === args.status);
    }

    const enhanced = await Promise.all(
      requests.map(async (r) => {
        const emp = await ctx.db.get(r.employeeId);
        const dept = emp ? await ctx.db.get(emp.departmentId) : null;
        const type = await ctx.db.get(r.timeOffTypeId);
        const processor = r.processedBy
          ? await ctx.db.get(r.processedBy)
          : null;
        return {
          ...r,
          departmentName: dept?.name,
          employeeName: emp?.name,
          processorEmail: processor?.email,
          typeName: type?.name,
          unit: type?.unit,
        };
      })
    );

    return enhanced.sort((a, b) => b.startDate - a.startDate);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Create a time-off request */
export const create = mutation({
  args: {
    clerkId: v.optional(v.string()),
    endDate: v.number(),
    reason: v.optional(v.string()),
    startDate: v.number(),
    timeOffTypeId: v.id("timeOffTypes"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const employeeId = user.employeeId;

    if (!employeeId) {
      throw new Error("No employee profile linked to your account.");
    }

    if (isInvalidDateRange(args.startDate, args.endDate)) {
      throw new Error("Start date cannot be after end date.");
    }

    if (user.role === "employee" && isPastDate(args.startDate)) {
      throw new Error("Cannot create leave requests for past dates.");
    }

    const type = await ctx.db.get(args.timeOffTypeId);
    if (!type) {
      throw new Error("Leave type not found.");
    }
    if (!type.isActive) {
      throw new Error(`"${type.name}" is no longer active.`);
    }

    const duration = calculateLeaveDays(args.startDate, args.endDate);

    let allocationId: Id<"timeOffAllocations"> | undefined;
    if (type.requiresBalance) {
      const allocation = await ctx.db
        .query("timeOffAllocations")
        .withIndex("by_employee_type", (q) =>
          q.eq("employeeId", employeeId).eq("timeOffTypeId", args.timeOffTypeId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (!allocation) {
        throw new Error(
          `No active allocation found for "${type.name}". Contact your HR manager.`
        );
      }

      const available =
        allocation.allocatedAmount +
        allocation.adjustedDays -
        allocation.takenAmount;
      if (available < duration) {
        throw new Error(
          `Insufficient ${type.name} balance. Available: ${available} ${type.unit}, Requested: ${duration} ${type.unit}.`
        );
      }

      allocationId = allocation._id;
    }

    const allMyRequests = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
      .collect();

    const overlap = hasOverlap(args.startDate, args.endDate, allMyRequests);
    if (overlap) {
      throw new Error(
        "You already have a leave request overlapping these dates."
      );
    }

    const dup = isDuplicate(
      args.startDate,
      args.endDate,
      args.timeOffTypeId,
      allMyRequests as any
    );
    if (dup) {
      throw new Error(
        "An identical leave request already exists for these dates."
      );
    }

    const requestId = await ctx.db.insert("timeOffRequests", {
      allocationId: allocationId ?? undefined,
      duration,
      employeeId,
      endDate: args.endDate,
      reason: args.reason,
      startDate: args.startDate,
      status: "pending",
      timeOffTypeId: args.timeOffTypeId,
    });

    await recordHistory(ctx, {
      action: "request_created",
      newStatus: "pending",
      performedBy: user._id,
      timeOffRequestId: requestId,
    });

    return requestId;
  },
});

/** Approve a time-off request (HR Manager+) */
export const approve = mutation({
  args: {
    clerkId: v.optional(v.string()),
    comment: v.optional(v.string()),
    requestId: v.id("timeOffRequests"),
  },
  handler: async (ctx, args) => {
    const user = await requireMinRole(ctx, "hr_manager", args.clerkId);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Time off request not found.");
    }

    if (request.status !== "pending") {
      throw new Error(
        `This request has already been ${request.status}. Cannot approve.`
      );
    }

    if (request.employeeId === user.employeeId) {
      throw new Error("You cannot approve your own leave request.");
    }

    if (request.allocationId) {
      await consumeAllocation(ctx, request.allocationId, request.duration);
    }

    await ctx.db.patch(args.requestId, {
      processedAt: Date.now(),
      processedBy: user._id,
      status: "approved",
    });

    await recordHistory(ctx, {
      action: "approved",
      comment: args.comment,
      newStatus: "approved",
      performedBy: user._id,
      previousStatus: "pending",
      timeOffRequestId: args.requestId,
    });
  },
});

/** Refuse a time-off request (HR Manager+) */
export const refuse = mutation({
  args: {
    clerkId: v.optional(v.string()),
    rejectionReason: v.string(),
    requestId: v.id("timeOffRequests"),
  },
  handler: async (ctx, args) => {
    const user = await requireMinRole(ctx, "hr_manager", args.clerkId);

    if (!args.rejectionReason.trim()) {
      throw new Error("Rejection reason is required.");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Time off request not found.");
    }

    if (request.status !== "pending") {
      throw new Error(
        `This request has already been ${request.status}. Cannot refuse.`
      );
    }

    await ctx.db.patch(args.requestId, {
      processedAt: Date.now(),
      processedBy: user._id,
      rejectionReason: args.rejectionReason.trim(),
      status: "refused",
    });

    await recordHistory(ctx, {
      action: "refused",
      comment: args.rejectionReason.trim(),
      newStatus: "refused",
      performedBy: user._id,
      previousStatus: "pending",
      timeOffRequestId: args.requestId,
    });
  },
});

/** Cancel a request (Employee can cancel own PENDING only) */
export const cancel = mutation({
  args: {
    clerkId: v.optional(v.string()),
    requestId: v.id("timeOffRequests"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Time off request not found.");
    }

    if (request.employeeId !== user.employeeId) {
      throw new Error("Can only cancel your own requests.");
    }

    if (request.status !== "pending") {
      throw new Error(
        `Cannot cancel a ${request.status} request. Only pending requests can be cancelled.`
      );
    }

    await ctx.db.patch(args.requestId, {
      cancelledAt: Date.now(),
      status: "cancelled",
    });

    await recordHistory(ctx, {
      action: "cancelled",
      newStatus: "cancelled",
      performedBy: user._id,
      previousStatus: "pending",
      timeOffRequestId: args.requestId,
    });
  },
});
