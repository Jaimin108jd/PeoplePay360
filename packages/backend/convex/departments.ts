import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMinRole, requireUser } from "./lib/rbac";

export const list = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx) => {
    // await requireUser(ctx, args.clerkId);
    return await ctx.db.query("departments").collect();
  },
});

export const get = query({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("departments"),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.clerkId);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    clerkId: v.optional(v.string()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new Error("Department name cannot be empty");
    }
    return await ctx.db.insert("departments", { name: trimmed });
  },
});

export const update = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("departments"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);
    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new Error("Department name cannot be empty");
    }
    await ctx.db.patch(args.id, { name: trimmed });
  },
});

export const remove = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("departments"),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    // Guard: Prevent deletion if employees are assigned to this department
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_department", (q) => q.eq("departmentId", args.id))
      .first();

    if (employees) {
      throw new Error(
        "Cannot delete department with active or assigned employees"
      );
    }

    await ctx.db.delete(args.id);
  },
});
