import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMinRole } from "./lib/rbac";

export const list = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    const structures = await ctx.db.query("salaryStructures").collect();
    return structures.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    active: v.boolean(),
    clerkId: v.optional(v.string()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_payroll_manager", args.clerkId);
    const name = args.name.trim();
    if (!name) {
      throw new Error("Salary structure name cannot be empty");
    }

    const existing = await ctx.db.query("salaryStructures").collect();
    if (
      existing.some(
        (structure) => structure.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      throw new Error("A salary structure with this name already exists");
    }

    return await ctx.db.insert("salaryStructures", {
      active: args.active,
      name,
    });
  },
});

export const update = mutation({
  args: {
    active: v.optional(v.boolean()),
    clerkId: v.optional(v.string()),
    id: v.id("salaryStructures"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_payroll_manager", args.clerkId);
    const structure = await ctx.db.get(args.id);
    if (!structure) {
      throw new Error("Salary structure not found");
    }

    const name = args.name?.trim();
    if (name !== undefined && !name) {
      throw new Error("Salary structure name cannot be empty");
    }
    await ctx.db.patch(args.id, {
      ...(name === undefined ? {} : { name }),
      ...(args.active === undefined ? {} : { active: args.active }),
    });
  },
});

export const remove = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("salaryStructures"),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_payroll_manager", args.clerkId);
    const contracts = await ctx.db
      .query("contracts")
      .filter((q) => q.eq(q.field("salaryStructureId"), args.id))
      .first();
    if (contracts) {
      throw new Error("Cannot delete a salary structure used by a contract");
    }
    const rules = await ctx.db
      .query("salaryRules")
      .withIndex("by_structure_sequence", (q) => q.eq("structureId", args.id))
      .collect();
    for (const rule of rules) {
      await ctx.db.delete(rule._id);
    }
    await ctx.db.delete(args.id);
  },
});
