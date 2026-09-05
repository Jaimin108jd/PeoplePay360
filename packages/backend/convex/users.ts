import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser, requireRole } from "./lib/rbac";

export const roleValidator = v.union(
  v.literal("employee"),
  v.literal("hr_manager"),
  v.literal("hr_payroll_user"),
  v.literal("hr_payroll_manager"),
  v.literal("admin")
);

// Query to get currently authenticated user's db record
export const me = query({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user) {
      return user;
    }
    if (args.clerkId) {
      return await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
        .unique();
    }
    return null;
  },
});

// Admin-only: list users with optional search and role filtering
export const list = query({
  args: {
    clerkId: v.optional(v.string()),
    role: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"], args.clerkId);
    let users = await ctx.db.query("users").collect();

    if (args.role && args.role !== "all") {
      users = users.filter((u) => u.role === args.role);
    }

    const enhanced = await Promise.all(
      users.map(async (u) => {
        const employee = u.employeeId ? await ctx.db.get(u.employeeId) : null;
        return {
          ...u,
          employeeJob: employee?.jobPosition,
          employeeName: employee?.name,
        };
      })
    );

    if (args.search) {
      const q = args.search.toLowerCase().trim();
      return enhanced.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.employeeName && u.employeeName.toLowerCase().includes(q)) ||
          u.clerkId.toLowerCase().includes(q)
      );
    }

    return enhanced;
  },
});

// Role-hierarchy based user creation in Convex (dual-sync with Clerk creation)
// - admin can create users of any role
// - hr_payroll_manager can create [employee, hr_manager, hr_payroll_user]
// - hr_payroll_user can create [employee, hr_manager]
// - hr_manager can create [employee]
export const adminCreateUser = mutation({
  args: {
    callerClerkId: v.optional(v.string()),
    clerkId: v.string(),
    email: v.string(),
    employeeId: v.optional(v.id("employees")),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(
      ctx,
      ["admin", "hr_payroll_manager", "hr_payroll_user", "hr_manager"],
      args.callerClerkId
    );

    // Enforce hierarchy creation rights
    if (caller.role === "hr_payroll_manager") {
      if (!["employee", "hr_manager", "hr_payroll_user"].includes(args.role)) {
        throw new Error(
          "HR Payroll Manager can only create Employee, HR Manager, or HR Payroll User accounts"
        );
      }
    } else if (caller.role === "hr_payroll_user") {
      if (!["employee", "hr_manager"].includes(args.role)) {
        throw new Error(
          "HR Payroll User can only create Employee or HR Manager accounts"
        );
      }
    } else if (caller.role === "hr_manager" && args.role !== "employee") {
      throw new Error("HR Manager can only create Employee accounts");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        employeeId: args.employeeId,
        role: args.role,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      employeeId: args.employeeId,
      role: args.role,
    });
  },
});

// Admin-only: delete user from Convex (protects against self-deletion)
export const adminDeleteUser = mutation({
  args: {
    callerClerkId: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, ["admin"], args.callerClerkId);
    if (caller._id === args.userId) {
      throw new Error("Cannot delete your own administrative account");
    }

    await ctx.db.delete(args.userId);
  },
});

// Admin helper: list unlinked or all employees to allow linking
export const listEmployeesForLinking = query({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"], args.clerkId);
    return await ctx.db.query("employees").collect();
  },
});

// Admin-only: update user role
export const updateRole = mutation({
  args: {
    clerkId: v.optional(v.string()),
    role: roleValidator,
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"], args.clerkId);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// Admin-only: link user to employee record
export const linkEmployee = mutation({
  args: {
    clerkId: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"], args.clerkId);
    await ctx.db.patch(args.userId, {
      employeeId: args.employeeId ?? undefined,
    });
  },
});

// Webhook or first-user sync from Clerk
// If this is the FIRST user in the database, make them Admin automatically.
// Subsequent users created via invite or admin-created flow get assigned roles.
export const ensureUser = mutation({
  args: {
    clerkId: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let clerkId: string | null = null;
    let email: string = args.email ?? "";

    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      clerkId = identity.subject;
      if (!email && identity.email) {
        email = identity.email;
      }
    } else if (args.clerkId) {
      clerkId = args.clerkId;
    }

    if (!clerkId) {
      return null;
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId!))
      .unique();

    if (existing) {
      if (email && existing.email !== email) {
        await ctx.db.patch(existing._id, { email });
      }
      return existing;
    }

    const existingByEmail = email
      ? await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), email))
          .first()
      : null;

    if (existingByEmail) {
      await ctx.db.patch(existingByEmail._id, {
        clerkId,
        ...(email && existingByEmail.email !== email ? { email } : {}),
      });
      return await ctx.db.get(existingByEmail._id);
    }

    const anyUser = await ctx.db.query("users").first();
    const initialRole = anyUser === null ? "admin" : "employee";

    const id = await ctx.db.insert("users", {
      clerkId,
      email,
      role: initialRole,
    });

    return await ctx.db.get(id);
  },
});

export const syncFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    role: v.optional(roleValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        ...(args.role ? { role: args.role } : {}),
      });
      return existing._id;
    }

    const existingByEmail = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingByEmail) {
      await ctx.db.patch(existingByEmail._id, {
        clerkId: args.clerkId,
        email: args.email,
        ...(args.role ? { role: args.role } : {}),
      });
      return existingByEmail._id;
    }

    const anyUser = await ctx.db.query("users").first();
    const initialRole = anyUser === null ? "admin" : (args.role ?? "employee");

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      role: initialRole,
    });
  },
});

// Delete user (e.g. from clerk webhook user.deleted)
export const deleteUserByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});
