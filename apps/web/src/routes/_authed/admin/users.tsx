import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Info,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/admin/users")({
  component: AdminUsersPage,
});

const ROLES = [
  {
    value: "employee",
    label: "Employee",
    desc: "View personal payslips, contracts, submit time off",
  },
  {
    value: "hr_manager",
    label: "HR Manager",
    desc: "Manage employees, departments, approve leave requests",
  },
  {
    value: "hr_payroll_user",
    label: "HR Payroll User",
    desc: "Compute drafts, process attendance and view payruns",
  },
  {
    value: "hr_payroll_manager",
    label: "HR Payroll Manager",
    desc: "Validate and confirm payrun batches",
  },
  {
    value: "admin",
    label: "System Admin",
    desc: "Full system control, role assignment, configuration",
  },
] as const;

function AdminUsersPage() {
  const { user } = useUser();
  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : {}
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const users = useQuery(
    api.users.list,
    currentUser?.role === "admin"
      ? {
          role: roleFilter === "all" ? undefined : roleFilter,
          search: search.trim() ? search.trim() : undefined,
        }
      : "skip"
  );
  const employees = useQuery(
    api.users.listEmployeesForLinking,
    currentUser?.role === "admin" ? {} : "skip"
  );
  const updateRole = useMutation(api.users.updateRole);
  const linkEmployee = useMutation(api.users.linkEmployee);
  const adminDeleteUser = useMutation(api.users.adminDeleteUser);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (currentUser === undefined || users === undefined) {
    return (
      <div className="p-8">
        <div className="mb-2 h-6 w-48 animate-pulse rounded-md bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              className="h-16 w-full animate-pulse rounded-lg border border-border bg-card"
              key={i}
            />
          ))}
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="font-semibold text-foreground text-lg">
          Access Restricted
        </h2>
        <p className="mt-1 max-w-md text-muted-foreground text-sm">
          Only administrators can access this view.
        </p>
      </div>
    );
  }

  const handleRoleChange = async (userId: Id<"users">, newRole: string) => {
    try {
      setUpdatingId(userId);
      await updateRole({ userId, role: newRole as any });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEmployeeLink = async (
    userId: Id<"users">,
    employeeId: string
  ) => {
    if (!employeeId) {
      return;
    }
    try {
      setUpdatingId(userId);
      await linkEmployee({
        userId,
        employeeId: employeeId as Id<"employees">,
      });
      toast.success("Linked to employee record");
    } catch {
      toast.error("Failed to link employee");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (u: { _id: Id<"users">; email: string }) => {
    if (
      confirm(
        `Permanently delete ${u.email}'s account?\n\nThis cannot be undone.`
      )
    ) {
      try {
        setDeletingId(u._id);
        await adminDeleteUser({ userId: u._id });
        toast.success(`User ${u.email} deleted`);
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error?.message || "Failed to delete user");
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              User Management
            </h1>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
              Admin Only
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage users, assign roles, and link accounts to employee records.
          </p>
        </div>
      </div>

      {/* Role Hierarchy Reference */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 font-semibold text-foreground text-xs">
          <Info className="size-4 text-primary" />
          <span>Role Hierarchy</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((r, idx) => (
            <div
              className="flex flex-col justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
              key={r.value}
            >
              <div>
                <span className="font-semibold text-foreground text-xs">
                  Level {idx + 1}: {r.label}
                </span>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  {r.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-lg border border-input bg-card pr-8 pl-9 text-foreground text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            type="text"
            value={search}
          />
          {search && (
            <button
              className="absolute top-2.5 right-2.5 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
              type="button"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Role:</span>
          <select
            className="h-9 rounded-lg border border-input bg-card px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setRoleFilter(e.target.value)}
            value={roleFilter}
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="font-medium text-foreground text-xs">
              System Accounts ({users.length})
            </span>
          </div>
        </div>

        <div className="divide-y divide-border">
          {users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No users found.
            </div>
          ) : (
            users.map((u) => {
              const isSelf = u._id === currentUser._id;
              return (
                <div
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between"
                  key={u._id}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
                      {u.email ? u.email[0].toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-foreground text-sm">
                          {u.email}
                        </span>
                        {isSelf && (
                          <span className="rounded-xs bg-muted px-1.5 py-0.2 font-medium text-[10px] text-muted-foreground">
                            You
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                        <span>{u.email}</span>
                        {u.employeeName ? (
                          <span className="flex items-center gap-1 text-primary">
                            <UserCheck className="size-3.5" />
                            <span>
                              Linked: {u.employeeName} ({u.employeeJob})
                            </span>
                          </span>
                        ) : (
                          <span className="text-warning text-xs">
                            No employee linked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        disabled={updatingId === u._id}
                        onChange={(e) =>
                          handleEmployeeLink(u._id, e.target.value)
                        }
                        value={u.employeeId || ""}
                      >
                        <option value="">-- Link Employee --</option>
                        {employees?.map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.name} ({emp.jobPosition})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2.5 font-medium text-foreground text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        disabled={updatingId === u._id || isSelf}
                        onChange={(e) =>
                          handleRoleChange(u._id, e.target.value)
                        }
                        value={u.role}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isSelf && (
                      <button
                        className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                        disabled={deletingId === u._id}
                        onClick={() =>
                          handleDeleteUser({
                            _id: u._id,
                            email: u.email,
                          })
                        }
                        title="Delete user"
                        type="button"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
