import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Building2,
  ChevronRight,
  Kanban,
  List,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminCreateClerkUserFn,
  adminDeleteClerkUserFn,
} from "../../../server/users";

export const Route = createFileRoute("/_authed/employees/")({
  component: EmployeesDirectoryPage,
});

type ViewMode = "table" | "kanban";

const ALL_ROLES = [
  {
    value: "employee",
    label: "Employee",
    desc: "Own Attendance, Time Off Requests",
  },
  {
    value: "hr_manager",
    label: "HR Manager",
    desc: "Employees, Contracts, Working Schedules, Attendance, Time Off",
  },
  {
    value: "hr_payroll_user",
    label: "HR Payroll User",
    desc: "HR Manager scope + Payruns, Payslips",
  },
  {
    value: "hr_payroll_manager",
    label: "HR Payroll Manager",
    desc: "HR Payroll User scope + Salary Structures & Rules",
  },
  {
    value: "admin",
    label: "System Admin",
    desc: "Full access + User & System governance",
  },
] as const;

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  employee: 1,
  hr_manager: 2,
  hr_payroll_manager: 4,
  hr_payroll_user: 3,
};

function canCreateRole(callerRole: string, targetRole: string): boolean {
  if (callerRole === "admin") {
    return true;
  }
  if (callerRole === "hr_payroll_manager") {
    return ["employee", "hr_manager", "hr_payroll_user"].includes(targetRole);
  }
  if (callerRole === "hr_payroll_user") {
    return ["employee", "hr_manager"].includes(targetRole);
  }
  if (callerRole === "hr_manager") {
    return targetRole === "employee";
  }
  return false;
}

function roleBadgeColor(role: string): string {
  switch (role) {
    case "admin":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "hr_payroll_manager":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "hr_payroll_user":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "hr_manager":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
}

async function copyPassword(password: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error("Clipboard access is unavailable in this browser.");
  }
  await navigator.clipboard.writeText(password);
}

function generateTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const required = ["A", "a", "2", "!"];
  const remaining = Array.from(
    { length: 4 },
    (_, index) =>
      alphabet[
        (crypto.getRandomValues(new Uint32Array(1))[0] + index) %
          alphabet.length
      ]
  );
  return [...required, ...remaining].sort(() => Math.random() - 0.5).join("");
}

function isValidPassword(password: string): boolean {
  return (
    password.length === 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function EmployeesDirectoryPage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : {}
  );
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Backend queries — unified employee list (already hierarchy-filtered server-side)
  const employees = useQuery(
    api.employees.list,
    user?.id
      ? {
          clerkId: user.id,
          departmentId:
            departmentFilter === "all"
              ? undefined
              : (departmentFilter as Id<"departments">),
          search: search.trim() || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        }
      : {}
  );

  const departments = useQuery(
    api.departments.list,
    user?.id ? { clerkId: user.id } : {}
  );
  const schedules = useQuery(
    api.workingSchedules.list,
    user?.id ? { clerkId: user.id } : "skip"
  );
  // Unfiltered list for manager dropdown
  const allEmployeesForManager = useQuery(
    api.employees.listAll,
    user?.id ? { clerkId: user.id } : {}
  );

  // Mutations
  const createEmployee = useMutation(api.employees.create);
  const adminCreateUser = useMutation(api.users.adminCreateUser);
  const adminDeleteUser = useMutation(api.users.adminDeleteUser);
  const removeEmployee = useMutation(api.employees.remove);

  // Creation Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee + User Form State (unified — always creates both)
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [empJobPosition, setEmpJobPosition] = useState("");
  const [empDepartmentId, setEmpDepartmentId] = useState<string>("");
  const [empManagerId, setEmpManagerId] = useState<string>("");
  const [empScheduleId, setEmpScheduleId] = useState<string>("");
  const [empType, setEmpType] = useState<
    "full_time" | "part_time" | "contract"
  >("full_time");
  const [empRole, setEmpRole] = useState<string>("employee");

  // Hierarchy
  const myRole = currentUser?.role ?? "employee";
  const isEmployeeRole = myRole === "employee";
  const canCreate = !isEmployeeRole;

  // Allowed roles based on caller hierarchy
  const creatableRoles = ALL_ROLES.filter((r) =>
    canCreateRole(myRole, r.value)
  );

  // Role-filtered visibility for the role dropdown in the form
  const visibleRoles = ALL_ROLES.filter((r) => {
    const minLevel = ROLE_HIERARCHY[myRole] ?? 0;
    const targetLevel = ROLE_HIERARCHY[r.value] ?? 0;
    return targetLevel <= minLevel;
  });

  const normalizedEmail = empEmail.trim().toLowerCase();
  const passwordIsValid =
    empPassword.trim().length === 0 || isValidPassword(empPassword.trim());
  const isCreateFormValid = Boolean(
    empName.trim() &&
      normalizedEmail &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
      empJobPosition.trim() &&
      empDepartmentId &&
      empRole &&
      creatableRoles.some((role) => role.value === empRole) &&
      passwordIsValid
  );

  // Handle Employee + User creation (always both)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreateFormValid) {
      toast.error(
        passwordIsValid
          ? "Complete the required fields with a valid email and role."
          : "Password must be exactly 8 characters with uppercase, lowercase, number, and symbol."
      );
      setIsSubmitting(false);
      return;
    }

    let clerkId: string | undefined;
    let newEmpId: Id<"employees"> | undefined;
    let linkedUserId: Id<"users"> | undefined;
    try {
      setIsSubmitting(true);
      const password = empPassword.trim() || generateTemporaryPassword();
      if (!empPassword.trim()) {
        setEmpPassword(password);
        setGeneratedPassword(password);
      }

      // Clerk must succeed before an employee record is created or linked.
      const clerkRes = await adminCreateClerkUserFn({
        data: {
          email: normalizedEmail,
          password,
          role: empRole,
        },
      });
      clerkId = clerkRes.clerkId;

      newEmpId = await createEmployee({
        departmentId: empDepartmentId as Id<"departments">,
        email: normalizedEmail,
        employeeType: empType,
        jobPosition: empJobPosition.trim(),
        managerId: empManagerId ? (empManagerId as Id<"employees">) : undefined,
        name: empName.trim(),
        scheduleId: empScheduleId
          ? (empScheduleId as Id<"workingSchedules">)
          : undefined,
        status: "active",
      });

      linkedUserId = await adminCreateUser({
        clerkId,
        email: normalizedEmail,
        employeeId: newEmpId,
        role: empRole as any,
      });

      const copied = await copyPassword(password)
        .then(() => true)
        .catch(() => false);
      toast.success(
        copied
          ? `Employee and account created. Temporary password copied: ${password}`
          : `Employee and account created. Temporary password: ${password}`
      );
    } catch (err: unknown) {
      if (linkedUserId) {
        try {
          await adminDeleteUser({
            userId: linkedUserId,
          });
        } catch (cleanupErr) {
          console.error(
            "[Employee Create] Convex account cleanup failed:",
            cleanupErr
          );
        }
      }
      if (newEmpId) {
        try {
          await removeEmployee({
            id: newEmpId,
          });
        } catch (cleanupErr) {
          console.error(
            "[Employee Create] Employee cleanup failed:",
            cleanupErr
          );
        }
      }
      if (clerkId) {
        try {
          await adminDeleteClerkUserFn({ data: { clerkId } });
        } catch (cleanupErr) {
          console.error("[Employee Create] Clerk cleanup failed:", cleanupErr);
        }
      }
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Account creation failed: ${msg}`);
      setIsSubmitting(false);
      return;
    }

    // Reset form
    setIsSheetOpen(false);
    setEmpName("");
    setEmpEmail("");
    setEmpPassword("");
    setGeneratedPassword("");
    setEmpJobPosition("");
    setEmpDepartmentId("");
    setEmpManagerId("");
    setEmpScheduleId("");
    setEmpRole("employee");
    setIsSubmitting(false);
  };

  const handleDeleteAccount = async (employee: {
    name: string;
    email: string;
    linkedUserId?: Id<"users">;
    linkedClerkId?: string;
  }) => {
    if (!(employee.linkedUserId && undefined)) {
      toast.error("This employee does not have a deletable login account.");
      return;
    }
    const confirmed = window.confirm(
      `Delete the login account for ${employee.name} (${employee.email})?\n\nThis permanently removes their Clerk sign-in and system access. The employee record will remain for HR history. This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }
    try {
      await adminDeleteClerkUserFn({
        data: { clerkId: "" },
      });
      await adminDeleteUser({
        userId: employee.linkedUserId,
      });
      toast.success(`Login account for ${employee.name} deleted`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete account"
      );
    }
  };

  // Filter employees by role (client-side, on top of server hierarchy filter)
  const displayEmployees = employees?.filter((emp) => {
    if (roleFilter === "all") {
      return true;
    }
    return emp.linkedUserRole === roleFilter;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              People Directory
            </h1>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs capitalize">
              {myRole.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Organization members filtered by your access level. Each person has
            a role and login account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-2xs">
            <button
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("table")}
              type="button"
            >
              <List className="size-3.5" />
              <span>List</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition-colors ${
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("kanban")}
              type="button"
            >
              <Kanban className="size-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {canCreate && (
            <button
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs transition-all hover:bg-primary/90"
              onClick={() => setIsSheetOpen(true)}
              type="button"
            >
              <Plus className="size-4" />
              <span>New Person</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-lg border border-input bg-background pr-8 pl-9 text-foreground text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, position, or department..."
            type="text"
            value={search}
          />
          {search && (
            <button
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
              type="button"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Role:</span>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => setRoleFilter(e.target.value)}
              value={roleFilter}
            >
              <option value="all">All Roles</option>
              {visibleRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Dept:</span>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => setDepartmentFilter(e.target.value)}
              value={departmentFilter}
            >
              <option value="all">All Departments</option>
              {departments?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Status:</span>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => setStatusFilter(e.target.value)}
              value={statusFilter}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── TABLE VIEW ─── */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border border-b bg-muted/40 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayEmployees === undefined ? (
                  <tr>
                    <td className="p-8 text-center" colSpan={7}>
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Loading directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayEmployees.length === 0 ? (
                  <tr>
                    <td
                      className="p-12 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      <Users className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">
                        No people found
                      </p>
                      <p className="text-xs">
                        Try adjusting filters or add a new person.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayEmployees.map((emp) => (
                    <tr
                      className="group cursor-pointer transition-colors hover:bg-muted/30"
                      key={emp._id}
                    >
                      <td className="px-4 py-3">
                        <Link
                          className="flex items-center gap-3 font-semibold text-foreground hover:text-primary"
                          params={{ employeeId: emp._id }}
                          to="/employees/$employeeId"
                        >
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                            {emp.name[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{emp.name}</span>
                            <span className="block font-normal text-[11px] text-muted-foreground">
                              {emp.email}
                            </span>
                          </div>
                        </Link>
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {emp.jobPosition}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {emp.departmentName || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px] capitalize ${roleBadgeColor(emp.linkedUserRole)}`}
                        >
                          {emp.linkedUserRole.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {emp.employeeType.replace(/_/g, " ")}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px] capitalize ${
                            emp.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : emp.status === "inactive"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 font-medium text-foreground text-xs shadow-2xs hover:bg-muted"
                            params={{ employeeId: emp._id }}
                            to="/employees/$employeeId"
                          >
                            <span>View</span>
                            <ChevronRight className="size-3 text-muted-foreground" />
                          </Link>
                          {myRole === "admin" && emp.linkedUserId && (
                            <button
                              aria-label={`Delete ${emp.name} login account`}
                              className="inline-flex items-center rounded-md border border-destructive/30 px-2 py-1 text-destructive text-xs hover:bg-destructive/10"
                              onClick={() => handleDeleteAccount(emp)}
                              type="button"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── KANBAN VIEW ─── */}
      {viewMode === "kanban" && (
        <div className="space-y-4">
          {isEmployeeRole && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-xs">
              <p className="font-semibold text-foreground">
                Your employee card
              </p>
              <p className="mt-1 text-muted-foreground">
                This personal kanban shows your current employment status. HR
                teams see the full people board permitted by their role.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {(["active", "inactive", "terminated"] as const).map(
              (colStatus) => {
                const col =
                  displayEmployees?.filter((e) => e.status === colStatus) || [];
                return (
                  <div
                    className="flex flex-col rounded-xl border border-border bg-muted/20 p-4 shadow-2xs"
                    key={colStatus}
                  >
                    <div className="mb-3 flex items-center justify-between border-border border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2.5 rounded-full ${
                            colStatus === "active"
                              ? "bg-emerald-500"
                              : colStatus === "inactive"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                        />
                        <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                          {colStatus}
                        </h3>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-[11px] text-muted-foreground">
                        {col.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3 overflow-y-auto">
                      {col.length === 0 ? (
                        <div className="rounded-lg border border-border/80 border-dashed p-6 text-center text-muted-foreground text-xs">
                          No {colStatus} members
                        </div>
                      ) : (
                        col.map((emp) => (
                          <Link
                            className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 shadow-2xs transition-all hover:border-primary/50 hover:shadow-xs"
                            key={emp._id}
                            params={{ employeeId: emp._id }}
                            to="/employees/$employeeId"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                                {emp.name[0].toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground text-xs group-hover:text-primary">
                                  {emp.name}
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                  {emp.jobPosition}
                                </p>
                              </div>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="size-3" />
                                {emp.departmentName || "General"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 border-border/60 border-t pt-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px] capitalize ${roleBadgeColor(emp.linkedUserRole)}`}
                              >
                                <ShieldCheck className="mr-1 size-2.5" />
                                {emp.linkedUserRole.replace(/_/g, " ")}
                              </span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ─── CREATE PERSON SHEET ─── */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="slide-in-from-right h-full w-full max-w-xl overflow-y-auto border-border border-l bg-card p-6 shadow-2xl duration-200">
            <div className="flex items-center justify-between border-border border-b pb-4">
              <div>
                <h2 className="font-bold text-foreground text-lg tracking-tight">
                  Add New Person
                </h2>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Creates both an employee record and a login account.
                </p>
              </div>
              <button
                className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setIsSheetOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleCreate}>
              {/* Identity */}
              <div>
                <h3 className="mb-2 font-semibold text-foreground text-xs uppercase tracking-wider">
                  Identity & Login
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        Full Name *
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        onChange={(e) => setEmpName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        required
                        type="text"
                        value={empName}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        Email *
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        onChange={(e) => setEmpEmail(e.target.value)}
                        placeholder="sarah@company.com"
                        required
                        type="email"
                        value={empEmail}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        Password
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        maxLength={8}
                        minLength={8}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        placeholder="Exactly 8 characters"
                        type="password"
                        value={empPassword}
                      />
                      {empPassword.length > 0 && !passwordIsValid && (
                        <p className="mt-1 text-[11px] text-destructive">
                          Use exactly 8 characters with uppercase, lowercase,
                          number, and symbol.
                        </p>
                      )}
                      {generatedPassword && (
                        <button
                          className="mt-1 text-[11px] text-primary hover:underline"
                          onClick={() => {
                            copyPassword(generatedPassword)
                              .then(() =>
                                toast.success("Temporary password copied")
                              )
                              .catch((error: unknown) =>
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to copy password"
                                )
                              );
                          }}
                          type="button"
                        >
                          Copy generated password
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        System Role *
                      </label>
                      <select
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        onChange={(e) => setEmpRole(e.target.value)}
                        value={empRole}
                      >
                        {creatableRoles.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Info */}
              <div className="border-border border-t pt-4">
                <h3 className="mb-2 font-semibold text-foreground text-xs uppercase tracking-wider">
                  Work Details
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        Job Position *
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        onChange={(e) => setEmpJobPosition(e.target.value)}
                        placeholder="e.g. Senior Engineer"
                        required
                        type="text"
                        value={empJobPosition}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        Department *
                      </label>
                      <select
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        onChange={(e) => setEmpDepartmentId(e.target.value)}
                        required
                        value={empDepartmentId}
                      >
                        <option value="">-- Select --</option>
                        {departments?.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        Direct Manager
                      </label>
                      <select
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        onChange={(e) => setEmpManagerId(e.target.value)}
                        value={empManagerId}
                      >
                        <option value="">— None —</option>
                        {allEmployeesForManager?.map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.name} ({emp.jobPosition})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-foreground text-xs">
                        Working Schedule
                      </label>
                      <select
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                        onChange={(e) => setEmpScheduleId(e.target.value)}
                        value={empScheduleId}
                      >
                        <option value="">— Standard (Default) —</option>
                        {schedules?.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name} ({s.weeklyHours} hrs/wk)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-foreground text-xs">
                      Employment Type
                    </label>
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                      onChange={(e) => setEmpType(e.target.value as any)}
                      value={empType}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-border border-t pt-4">
                <button
                  className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                  onClick={() => setIsSheetOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="cursor-pointer rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isSubmitting || !isCreateFormValid}
                  type="submit"
                >
                  {isSubmitting ? "Creating..." : "Create Person"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
