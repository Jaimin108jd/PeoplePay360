import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMinRole } from "./lib/rbac";

// List all time-off types (anyone can view)
export const list = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx) => await ctx.db.query("timeOffTypes").collect(),
});

// List only active types (for dropdowns)
export const listActive = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx) => {
    const types = await ctx.db.query("timeOffTypes").collect();
    return types.filter((t) => t.isActive);
  },
});

// Get a single type
export const get = query({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("timeOffTypes"),
  },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

// Create a time-off type (HR Manager+)
export const create = mutation({
  args: {
    clerkId: v.optional(v.string()),
    defaultAllocation: v.optional(v.number()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    isPaid: v.boolean(),
    name: v.string(),
    requiresApproval: v.boolean(),
    requiresBalance: v.boolean(),
    unit: v.union(v.literal("days"), v.literal("hours")),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    if (!args.name.trim()) {
      throw new Error("Time-off type name is required");
    }

    if (args.defaultAllocation !== undefined && args.defaultAllocation < 0) {
      throw new Error("Default allocation cannot be negative");
    }

    return await ctx.db.insert("timeOffTypes", {
      defaultAllocation: args.defaultAllocation,
      description: args.description,
      isActive: args.isActive,
      isPaid: args.isPaid,
      name: args.name.trim(),
      requiresApproval: args.requiresApproval,
      requiresBalance: args.requiresBalance,
      unit: args.unit,
    });
  },
});

// Update a time-off type (HR Manager+)
export const update = mutation({
  args: {
    clerkId: v.optional(v.string()),
    defaultAllocation: v.optional(v.number()),
    description: v.optional(v.string()),
    id: v.id("timeOffTypes"),
    isActive: v.boolean(),
    isPaid: v.boolean(),
    name: v.string(),
    requiresApproval: v.boolean(),
    requiresBalance: v.boolean(),
    unit: v.union(v.literal("days"), v.literal("hours")),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    if (!args.name.trim()) {
      throw new Error("Time-off type name is required");
    }

    await ctx.db.patch(args.id, {
      defaultAllocation: args.defaultAllocation,
      description: args.description,
      isActive: args.isActive,
      isPaid: args.isPaid,
      name: args.name.trim(),
      requiresApproval: args.requiresApproval,
      requiresBalance: args.requiresBalance,
      unit: args.unit,
    });
  },
});

// Delete a time-off type (HR Manager+)
export const remove = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("timeOffTypes"),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    const allocRef = await ctx.db
      .query("timeOffAllocations")
      .filter((q) => q.eq(q.field("timeOffTypeId"), args.id))
      .first();

    if (allocRef) {
      throw new Error(
        "Cannot delete: this type has existing allocations. Remove allocations first."
      );
    }

    await ctx.db.delete(args.id);
  },
});
