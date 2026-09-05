import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type Role =
  | "employee"
  | "hr_manager"
  | "hr_payroll_user"
  | "hr_payroll_manager"
  | "admin";

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 5,
  employee: 1,
  hr_manager: 2,
  hr_payroll_manager: 4,
  hr_payroll_user: 3,
};

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
  fallbackClerkId?: string
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  const clerkIds = [
    identity?.subject,
    identity?.tokenIdentifier,
    fallbackClerkId,
  ].filter((value): value is string => Boolean(value));

  if (clerkIds.length === 0) {
    return null;
  }

  for (const clerkId of new Set(clerkIds)) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (user) {
      return user;
    }
  }

  if (identity?.email) {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (user) {
      return user;
    }
  }

  return null;
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  fallbackClerkId?: string
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx, fallbackClerkId);
  if (!user) {
    throw new Error(
      "Unauthorized: User not authenticated or not found in system."
    );
  }
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[],
  fallbackClerkId?: string
): Promise<Doc<"users">> {
  const user = await requireUser(ctx, fallbackClerkId);

  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Forbidden: Required role in [${allowedRoles.join(", ")}], user has role '${user.role}'`
    );
  }

  return user;
}

export async function requireMinRole(
  ctx: QueryCtx | MutationCtx,
  minRole: Role,
  fallbackClerkId?: string
): Promise<Doc<"users">> {
  const user = await requireUser(ctx, fallbackClerkId);

  if (!hasMinRole(user.role, minRole)) {
    throw new Error(
      `Forbidden: Minimum required role '${minRole}', user has role '${user.role}'`
    );
  }

  return user;
}
