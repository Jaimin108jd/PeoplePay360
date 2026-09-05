import { api } from "@PeoplePay360/backend/convex/_generated/api";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  Play,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardPage,
});

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted/60 ${className ?? ""}`} />
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value?: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-3.5 text-primary" />
        </div>
      </div>
      <div className="mt-3">
        {value !== undefined ? (
          <p className="font-mono font-semibold text-2xl text-foreground tracking-tight">
            {value}
          </p>
        ) : (
          <Skeleton className="mt-1 h-7 w-20" />
        )}
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function ActionRow({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3.5 transition-all hover:border-primary/30 hover:bg-muted/30"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function DashboardPage() {
  const { user } = useUser();
  const metrics = useQuery(
    api.dashboard.getMetrics,
    user?.id ? { clerkId: user.id } : "skip"
  );

  if (metrics === undefined) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-60 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (metrics === null) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
          <Clock className="size-6 animate-spin" />
        </div>
        <h2 className="font-semibold text-foreground text-base">Setting up your profile...</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Your account is syncing with the database. If this takes more than a moment, please refresh or ensure your admin has assigned your role.
        </p>
      </div>
    );
  }

  const role = metrics.user.role;
  const name = metrics.currentEmployee?.name || metrics.user.email;
  const roleLabel = role.replace(/_/g, " ");

  const primaryAction = (
    {
      admin: { to: "/admin/users", label: "RBAC Governance", icon: ShieldCheck },
      hr_payroll_user: { to: "/payroll/payruns", label: "Payruns", icon: DollarSign },
      hr_payroll_manager: { to: "/payroll/payruns", label: "Payruns", icon: DollarSign },
      hr_manager: { to: "/time-off", label: "Review Time Off", icon: Calendar },
      employee: { to: "/attendance", label: "Log Attendance", icon: Clock },
    } as Record<string, { to: string; label: string; icon: React.ElementType }>
  )[role] ?? { to: "/dashboard", label: "Dashboard", icon: Clock };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-semibold text-xl text-foreground tracking-tight">
              Good {getTimeOfDay()},{" "}
              <span className="text-primary">
                {name.split(" ")[0] ?? name}
              </span>
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              {roleLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <Link
          to={primaryAction.to}
          className="group inline-flex items-center gap-2 self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] sm:self-auto"
        >
          <primaryAction.icon className="size-3.5" />
          {primaryAction.label}
          <span className="flex size-5 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3" />
          </span>
        </Link>
      </div>

      {/* Role-specific views */}
      {role === "employee" && <EmployeeDashboard metrics={metrics} />}
      {role === "hr_manager" && <HRManagerDashboard metrics={metrics} />}
      {role === "hr_payroll_user" && <PayrollUserDashboard metrics={metrics} />}
      {role === "hr_payroll_manager" && <PayrollManagerDashboard metrics={metrics} />}
      {role === "admin" && <AdminDashboard metrics={metrics} />}
    </div>
  );
}

// ─── Employee ─────────────────────────────────────────────────────────────────

function EmployeeDashboard({ metrics }: { metrics: any }) {
  const {
    currentEmployee,
    currentContract,
    employeeLeaveBalances,
    employeePayslips,
    employeeTimeOff,
  } = metrics;
  const latestPayslip = employeePayslips?.[0];
  const activeBalances = (employeeLeaveBalances ?? []).filter(
    (b: any) => b.status === "active"
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contract Status"
          value={currentContract?.status ?? "No Contract"}
          sub={
            currentContract
              ? `₹${currentContract.wage.toLocaleString()} / month`
              : "Contact HR"
          }
          icon={FileCheck}
        />
        <StatCard
          label="Latest Net Pay"
          value={latestPayslip ? `₹${latestPayslip.net.toLocaleString()}` : "—"}
          sub={latestPayslip ? `Status: ${latestPayslip.status}` : "No pay history"}
          icon={DollarSign}
        />
        <StatCard
          label="Time Off Requests"
          value={employeeTimeOff.length}
          sub={`${employeeTimeOff.filter((t: any) => t.status === "pending").length} awaiting approval`}
          icon={Calendar}
        />
        <StatCard
          label="Position"
          value={
            <span className="truncate text-lg">
              {currentEmployee?.jobPosition ?? "Not linked"}
            </span>
          }
          sub={currentEmployee?.employeeType?.replace(/_/g, " ") ?? "Pending"}
          icon={Users}
        />
      </div>

      {activeBalances.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Leave Balance — {new Date().getFullYear()}
            </h2>
            <Link
              to="/time-off"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {activeBalances.map((b: any) => {
              const remaining =
                b.allocatedAmount + (b.adjustedDays ?? 0) - b.takenAmount;
              const pct = Math.min(
                Math.round((b.takenAmount / b.allocatedAmount) * 100),
                100
              );
              return (
                <div
                  key={b._id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {b.typeName ?? "Leave"}
                  </p>
                  <p className="mt-2 font-mono font-semibold text-2xl text-foreground tracking-tight">
                    {remaining}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    days left
                  </p>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {b.takenAmount} / {b.allocatedAmount} used
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Attendance
              </h3>
            </div>
            <Link
              to="/attendance"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open tracker <ArrowRight className="size-3" />
            </Link>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Check in and check out to record your working hours. Access your
            punch history from the tracker.
          </p>
          <Link
            to="/attendance"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Clock className="size-3.5" /> Punch In / Out
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Time Off
              </h3>
            </div>
            <Link
              to="/time-off"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Request leave <ArrowRight className="size-3" />
            </Link>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            View your leave allocations and submit vacation or sick leave
            requests for HR review.
          </p>
          <Link
            to="/time-off"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
          >
            <Calendar className="size-3.5" /> Submit Time Off
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── HR Manager ───────────────────────────────────────────────────────────────

function HRManagerDashboard({ metrics }: { metrics: any }) {
  const { counts, pendingLeaveRequests } = metrics;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Employees"
          value={counts.activeEmployees}
          sub={`${counts.totalEmployees} total records`}
          icon={Users}
        />
        <StatCard
          label="Pending Leave"
          value={counts.pendingLeaves}
          sub="Requires approval"
          icon={BadgeAlert}
        />
        <StatCard
          label="Attendance Exceptions"
          value={counts.attendanceExceptions}
          sub="Late or missing check-outs"
          icon={AlertTriangle}
        />
        <StatCard
          label="Departments"
          value={counts.departments}
          sub="Active cost centers"
          icon={Building}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Pending Leave Queue
            </h3>
            <Link
              to="/time-off"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Manage all ({counts.pendingLeaves}){" "}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {pendingLeaveRequests && pendingLeaveRequests.length > 0 ? (
            <div className="divide-y divide-border">
              {pendingLeaveRequests.map((req: any) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between py-3 text-xs"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {req.duration} day(s) requested
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      {new Date(req.startDate).toLocaleDateString()} -{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="size-8 text-emerald-500/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No pending requests
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Quick Actions
          </h3>
          <div className="space-y-2.5">
            <ActionRow
              to="/employees"
              icon={Users}
              title="Employee Directory"
              desc="View, filter and update records"
            />
            <ActionRow
              to="/contracts"
              icon={FileCheck}
              title="Contracts & Wages"
              desc="Review active salary assignments"
            />
            <ActionRow
              to="/attendance"
              icon={Clock}
              title="Attendance Overview"
              desc="Monitor daily punch records"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payroll User ─────────────────────────────────────────────────────────────

function PayrollUserDashboard({ metrics }: { metrics: any }) {
  const { counts, recentPayruns } = metrics;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Draft Payruns"
          value={counts.draftPayruns}
          sub="Awaiting computation"
          icon={FileText}
        />
        <StatCard
          label="Computed Batches"
          value={counts.computedPayruns}
          sub="Ready for validation"
          icon={Play}
        />
        <StatCard
          label="Active Employees"
          value={counts.activeEmployees}
          sub="Eligible for payrun"
          icon={UserCheck}
        />
        <StatCard
          label="Total Gross Run"
          value={`₹${counts.totalGrossLiability.toLocaleString()}`}
          sub="Across all runs"
          icon={DollarSign}
        />
      </div>
      <PayrunList
        runs={recentPayruns}
        title="Recent Payrun Batches"
        linkLabel="Create / Open Payrun"
      />
    </div>
  );
}

// ─── Payroll Manager ──────────────────────────────────────────────────────────

function PayrollManagerDashboard({ metrics }: { metrics: any }) {
  const { counts, recentPayruns } = metrics;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Awaiting Sign-off"
          value={counts.computedPayruns}
          sub="Pending validation"
          icon={FileCheck}
        />
        <StatCard
          label="Validated / Ready"
          value={counts.validatedPayruns}
          sub="Approved for disbursement"
          icon={CheckCircle2}
        />
        <StatCard
          label="Total Net Payout"
          value={`₹${counts.totalNetLiability.toLocaleString()}`}
          sub="Employee liability"
          icon={DollarSign}
        />
        <StatCard
          label="Active Warnings"
          value={counts.payslipWarningsCount}
          sub="Anomalies or missing data"
          icon={AlertTriangle}
        />
      </div>
      <PayrunList
        runs={recentPayruns}
        title="Validation & Payment Queue"
        linkLabel="Review Payrun Batches"
      />
    </div>
  );
}

function PayrunList({
  runs,
  title,
  linkLabel,
}: {
  runs: any[];
  title: string;
  linkLabel: string;
}) {
  const statusStyle: Record<string, string> = {
    validated: "bg-emerald-500/10 text-emerald-600",
    computed: "bg-amber-500/10 text-amber-600",
    draft: "bg-muted text-muted-foreground",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Link
          to="/payroll/payruns"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {linkLabel} <ArrowRight className="size-3" />
        </Link>
      </div>
      {runs && runs.length > 0 ? (
        <div className="divide-y divide-border">
          {runs.map((pr: any) => (
            <div
              key={pr._id}
              className="flex items-center justify-between py-3 text-xs"
            >
              <div>
                <p className="font-medium text-foreground">{pr.name}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {new Date(pr.periodStart).toLocaleDateString()} -{" "}
                  {new Date(pr.periodEnd).toLocaleDateString()} &middot;{" "}
                  {pr.employeeIds?.length ?? 0} employees
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyle[pr.status] ?? statusStyle.draft}`}
              >
                {pr.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            No payruns in pipeline
          </p>
          <Link
            to="/payroll/payruns"
            className="mt-3 text-xs text-primary hover:underline"
          >
            Create your first payrun
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────────

function AdminDashboard({ metrics }: { metrics: any }) {
  const { counts } = metrics;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Registered Users"
          value={counts.usersCount}
          sub="Synchronized identities"
          icon={Users}
        />
        <StatCard
          label="Salary Structures"
          value={counts.salaryStructuresCount}
          sub="Configured rule engines"
          icon={FileText}
        />
        <StatCard
          label="Departments"
          value={counts.departments}
          sub="Organizational hierarchy"
          icon={Building}
        />
        <StatCard
          label="Access Governance"
          value="RBAC Active"
          sub="Self-signups locked"
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Role & Identity Governance
            </h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Assign roles across the 5-tier hierarchy and link accounts to
            employee records to enable self-service payslips and attendance.
          </p>
          <div className="mt-5 space-y-2.5">
            <ActionRow
              to="/admin/users"
              icon={Users}
              title="User Manager"
              desc="Assign roles and link employee records"
            />
            <ActionRow
              to="/employees"
              icon={UserCheck}
              title="Employee Directory"
              desc="View and manage employee profiles"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <FileCheck className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              System Configuration
            </h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Configure working schedules, shift hours, break durations, and
            salary computation structures.
          </p>
          <div className="mt-5 space-y-2.5">
            <ActionRow
              to="/configuration/working-schedules"
              icon={Clock}
              title="Working Schedules"
              desc="Shifts, breaks, and hours configuration"
            />
            <ActionRow
              to="/configuration/salary-structures"
              icon={DollarSign}
              title="Salary Structures"
              desc="Rule engines for payrun computation"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
