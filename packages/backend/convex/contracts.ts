import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  hasContractOverlap,
  selectApplicableContract,
} from "./lib/payroll_engine";
import { requireMinRole, requireUser } from "./lib/rbac";

export const contractStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("expired"),
  v.literal("cancelled")
);

export const list = query({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);

    // If regular employee, only allow their own contracts
    let effectiveEmployeeId = args.employeeId;
    if (user.role === "employee") {
      if (!user.employeeId) {
        return [];
      }
      effectiveEmployeeId = user.employeeId;
    }

    let contracts = effectiveEmployeeId
      ? await ctx.db
          .query("contracts")
          .withIndex("by_employee_start", (q) =>
            q.eq("employeeId", effectiveEmployeeId!)
          )
          .collect()
      : await ctx.db.query("contracts").collect();

    if (args.status && args.status !== "all") {
      contracts = contracts.filter((c) => c.status === args.status);
    }

    const enhanced = await Promise.all(
      contracts.map(async (c) => {
        const emp = await ctx.db.get(c.employeeId);
        const dept = await ctx.db.get(c.departmentId);
        const struct = await ctx.db.get(c.salaryStructureId);
        return {
          ...c,
          departmentName: dept?.name,
          employeeJob: emp?.jobPosition,
          employeeName: emp?.name,
          salaryStructureName: struct?.name,
        };
      })
    );

    return enhanced.sort((a, b) => b.startDate - a.startDate);
  },
});

export const get = query({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    const contract = await ctx.db.get(args.id);
    if (!contract) {
      return null;
    }

    if (user.role === "employee" && user.employeeId !== contract.employeeId) {
      throw new Error("Forbidden: Access limited to own contract record");
    }

    const emp = await ctx.db.get(contract.employeeId);
    const dept = await ctx.db.get(contract.departmentId);
    const struct = await ctx.db.get(contract.salaryStructureId);

    return {
      ...contract,
      departmentName: dept?.name,
      employeeJob: emp?.jobPosition,
      employeeName: emp?.name,
      salaryStructureName: struct?.name,
    };
  },
});

export const getActiveForEmployee = query({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.id("employees"),
    periodEnd: v.optional(v.number()),
    periodStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.clerkId);
    if (user.role === "employee" && user.employeeId !== args.employeeId) {
      throw new Error("Forbidden: Access limited to own contract record");
    }

    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_employee_start", (q) =>
        q.eq("employeeId", args.employeeId)
      )
      .collect();

    const now = Date.now();
    const periodStart = args.periodStart ?? now;
    const periodEnd = args.periodEnd ?? now;

    return selectApplicableContract(contracts, periodStart, periodEnd);
  },
});

export const create = mutation({
  args: {
    clerkId: v.optional(v.string()),
    departmentId: v.id("departments"),
    employeeId: v.id("employees"),
    endDate: v.optional(v.number()),
    position: v.string(),
    salaryStructureId: v.id("salaryStructures"),
    startDate: v.number(),
    status: contractStatusValidator,
    wage: v.number(),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    if (args.wage <= 0) {
      throw new Error("Wage must be a positive number");
    }

    if (args.endDate !== undefined && args.endDate < args.startDate) {
      throw new Error("Contract end date cannot be earlier than start date");
    }

    // §8.1 Contract Date Overlap Enforcement
    if (args.status === "active") {
      const existing = await ctx.db
        .query("contracts")
        .withIndex("by_employee_start", (q) =>
          q.eq("employeeId", args.employeeId)
        )
        .collect();

      const overlaps = hasContractOverlap(existing, {
        endDate: args.endDate,
        startDate: args.startDate,
      });

      if (overlaps) {
        throw new Error(
          "Contract overlap violation (§8.1): Employee already has an active contract covering this date range."
        );
      }
    }

    const { ...contractData } = args;
    return await ctx.db.insert("contracts", contractData);
  },
});

export const update = mutation({
  args: {
    clerkId: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    endDate: v.optional(v.number()),
    id: v.id("contracts"),
    position: v.optional(v.string()),
    salaryStructureId: v.optional(v.id("salaryStructures")),
    startDate: v.optional(v.number()),
    status: v.optional(contractStatusValidator),
    wage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    const existingContract = await ctx.db.get(args.id);
    if (!existingContract) {
      throw new Error("Contract not found");
    }

    const newStart = args.startDate ?? existingContract.startDate;
    const newEnd =
      args.endDate === undefined ? existingContract.endDate : args.endDate;
    const newStatus = args.status ?? existingContract.status;
    const newWage = args.wage ?? existingContract.wage;

    if (newWage <= 0) {
      throw new Error("Wage must be a positive number");
    }

    if (newEnd !== undefined && newEnd < newStart) {
      throw new Error("Contract end date cannot be earlier than start date");
    }

    // If status is active (or staying active with updated dates), check for overlap
    if (newStatus === "active") {
      const allContracts = await ctx.db
        .query("contracts")
        .withIndex("by_employee_start", (q) =>
          q.eq("employeeId", existingContract.employeeId)
        )
        .collect();

      const overlaps = hasContractOverlap(allContracts, {
        _id: existingContract._id,
        endDate: newEnd,
        startDate: newStart,
      });

      if (overlaps) {
        throw new Error(
          "Contract overlap violation (§8.1): Another active contract overlaps with these dates."
        );
      }
    }

    const { id, ...patchData } = args;
    await ctx.db.patch(id, patchData);
  },
});

export const remove = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    const contract = await ctx.db.get(args.id);
    if (!contract) {
      return;
    }

    if (contract.status === "active") {
      throw new Error(
        "Cannot delete an active contract directly. Cancel or expire it first."
      );
    }

    await ctx.db.delete(args.id);
  },
});
