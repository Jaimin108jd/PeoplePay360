import { api } from "@PeoplePay360/backend/convex/_generated/api";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  AlertCircle,
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

function DashboardPage() {
  const { user } = useUser();
  const metrics = useQuery(
    api.dashboard.getMetrics,
    user?.id ? { clerkId: user.id } : {}
  );

  if (metrics === undefined) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-muted/60" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
              key={i}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="font-semibold text-foreground text-lg">
          Account Initializing
        </h2>
        <p className="mt-1 max-w-sm text-muted-foreground text-xs">
          Your profile is being synchronized with the database. Please refresh
          or check back in a moment.
        </p>
      </div>
    );
  }

  const role = metrics.user.role;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Top Welcome Bar */}
      <div className="flex flex-col gap-3 border-border border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              Operational Workspace
            </h1>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 font-semibold text-primary text-xs uppercase tracking-wider">
              {role.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs sm:text-sm">
            Welcome back,{" "}
            <span className="font-medium text-foreground">
              {metrics.currentEmployee?.name || metrics.user.email}
            </span>
            . Here is your personalized daily operations overview.
          </p>
        </div>

        {/* Quick Context Action */}
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
              to="/admin/users"
            >
              <ShieldCheck className="size-3.5" />
              <span>RBAC Governance</span>
            </Link>
          )}
          {(role === "hr_payroll_user" || role === "hr_payroll_manager") && (
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
              to="/payroll/payruns"
            >
              <DollarSign className="size-3.5" />
              <span>View Payruns</span>
            </Link>
          )}
          {role === "hr_manager" && (
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
              to="/time-off"
            >
              <Calendar className="size-3.5" />
              <span>Review Time Off</span>
            </Link>
          )}
          {role === "employee" && (
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
              to="/attendance"
            >
              <Clock className="size-3.5" />
              <span>Log Attendance</span>
            </Link>
          )}
        </div>
      </div>

      {/* Role-Specific Content */}
      {role === "employee" && <EmployeeDashboard metrics={metrics} />}
      {role === "hr_manager" && <HRManagerDashboard metrics={metrics} />}
      {role === "hr_payroll_user" && <PayrollUserDashboard metrics={metrics} />}
      {role === "hr_payroll_manager" && (
        <PayrollManagerDashboard metrics={metrics} />
      )}
      {role === "admin" && <AdminDashboard metrics={metrics} />}
    </div>
  );
}

// 1. Employee Dashboard View
function EmployeeDashboard({ metrics }: { metrics: any }) {
  const {
    currentEmployee,
    currentContract,
    employeeLeaveBalances,
    employeePayslips,
    employeeTimeOff,
  } = metrics;

  const latestPayslip = employeePayslips?.[0];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Contract Status
            </span>
            <FileCheck className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-foreground text-xl uppercase">
              {currentContract?.status || "No Contract"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {currentContract
              ? `Wage: ₹${currentContract.wage.toLocaleString()}`
              : "Contact HR for assignment"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Latest Payslip (Net)
            </span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-foreground text-xl">
              ₹{latestPayslip ? latestPayslip.net.toLocaleString() : "0"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {latestPayslip
              ? `Status: ${latestPayslip.status}`
              : "No pay history yet"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Time Off Requests
            </span>
            <Calendar className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-foreground text-xl">
              {employeeTimeOff.length}
            </span>
            <span className="text-muted-foreground text-xs">
              total submitted
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {employeeTimeOff.filter((t: any) => t.status === "pending").length}{" "}
            awaiting approval
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Designation
            </span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="truncate font-bold text-base text-foreground">
              {currentEmployee?.jobPosition || "Not Linked"}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {currentEmployee?.employeeType?.replace(/_/g, " ") ||
              "Personnel profile pending"}
          </p>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {employeeLeaveBalances && employeeLeaveBalances.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">
              Leave Balance — {new Date().getFullYear()}
            </h3>
            <Link
              className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              to="/time-off"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {employeeLeaveBalances
              .filter((b: any) => b.status === "active")
              .map((b: any) => {
                const remaining =
                  b.allocatedAmount + (b.adjustedDays ?? 0) - b.takenAmount;
                return (
                  <div
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-xs"
                    key={b._id}
                  >
                    <div>
                      <p className="font-semibold text-foreground text-xs">
                        {b.typeName || "Leave"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {b.takenAmount} used / {b.allocatedAmount} allocated
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-lg">
                        {remaining}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        remaining
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quick Attendance & Leave Shortcuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-border border-b pb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                Daily Attendance & Punch
              </h3>
            </div>
            <Link
              className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              to="/attendance"
            >
              Open tracker <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="size-6" />
            </div>
            <p className="font-medium text-foreground text-sm">
              Today's Attendance Status
            </p>
            <p className="mx-auto mt-1 max-w-sm text-muted-foreground text-xs">
              Check in and check out directly through the attendance punch card
              to record worked minutes.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90"
              to="/attendance"
            >
              Punch In / Out
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-border border-b pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-amber-500" />
              <h3 className="font-semibold text-foreground text-sm">
                Leave &amp; Time Off
              </h3>
            </div>
            <Link
              className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              to="/time-off"
            >
              Request leave <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Calendar className="size-6" />
            </div>
            <p className="font-medium text-foreground text-sm">
              Plan Your Leave Ahead
            </p>
            <p className="mx-auto mt-1 max-w-sm text-muted-foreground text-xs">
              View your leave allocations and submit vacation or sick leave
              requests for HR review.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground text-xs shadow-xs hover:bg-muted"
              to="/time-off"
            >
              Submit Time Off
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. HR Manager Dashboard View
function HRManagerDashboard({ metrics }: { metrics: any }) {
  const { counts, pendingLeaveRequests } = metrics;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Workforce Headcount
            </span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.activeEmployees}
            </span>
            <span className="text-muted-foreground text-xs">
              / {counts.totalEmployees} total
            </span>
          </div>
          <p className="mt-1 font-medium text-[11px] text-emerald-500">
            Active personnel records
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Pending Leave Approvals
            </span>
            <BadgeAlert className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.pendingLeaves}
            </span>
            <span className="text-muted-foreground text-xs">requests</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Requires manager validation
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Attendance Exceptions
            </span>
            <AlertTriangle className="size-4 text-destructive" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.attendanceExceptions}
            </span>
            <span className="text-muted-foreground text-xs">flagged days</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Late punches or missing check-outs
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Active Departments
            </span>
            <Building className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.departments}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Organized cost centers
          </p>
        </div>
      </div>

      {/* Operational Queues */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-border border-b pb-3">
            <h3 className="font-semibold text-foreground text-sm">
              Pending Leave Queue
            </h3>
            <Link
              className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              to="/time-off"
            >
              Manage all ({counts.pendingLeaves}){" "}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-2 divide-y divide-border">
            {pendingLeaveRequests && pendingLeaveRequests.length > 0 ? (
              pendingLeaveRequests.map((req: any) => (
                <div
                  className="flex items-center justify-between py-3 text-xs"
                  key={req._id}
                >
                  <div>
                    <span className="font-medium text-foreground">
                      Request for {req.duration} day(s)
                    </span>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(req.startDate).toLocaleDateString()} &ndash;{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-[11px] text-amber-600">
                    Pending
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No leave requests awaiting approval.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-border border-b pb-3">
            <h3 className="font-semibold text-foreground text-sm">
              Workforce Actions
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-3">
            <Link
              className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              to="/employees"
            >
              <div className="flex items-center gap-3">
                <Users className="size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground text-xs">
                    Employee Directory
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    View, filter and update employee records
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>

            <Link
              className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              to="/contracts"
            >
              <div className="flex items-center gap-3">
                <FileCheck className="size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground text-xs">
                    Contracts &amp; Salary Assignment
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Review active wages and working schedules
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. HR Payroll User Dashboard View
function PayrollUserDashboard({ metrics }: { metrics: any }) {
  const { counts, recentPayruns } = metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Draft Payruns
            </span>
            <FileText className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.draftPayruns}
            </span>
            <span className="text-muted-foreground text-xs">batches</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Awaiting computation trigger
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Computed Batches
            </span>
            <Play className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.computedPayruns}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ready for validation checks
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Active Employees
            </span>
            <UserCheck className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.activeEmployees}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Eligible for inclusion
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Total Gross Run
            </span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-foreground text-xl">
              ₹{counts.totalGrossLiability.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cumulative across all runs
          </p>
        </div>
      </div>

      {/* Payrun Processing Shortcuts */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-border border-b pb-3">
          <h3 className="font-semibold text-foreground text-sm">
            Recent Payrun Batches
          </h3>
          <Link
            className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
            to="/payroll/payruns"
          >
            Create / Open Payrun <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="mt-2 divide-y divide-border">
          {recentPayruns && recentPayruns.length > 0 ? (
            recentPayruns.map((pr: any) => (
              <div
                className="flex items-center justify-between py-3 text-xs"
                key={pr._id}
              >
                <div>
                  <span className="font-semibold text-foreground">
                    {pr.name}
                  </span>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Period: {new Date(pr.periodStart).toLocaleDateString()}{" "}
                    &ndash; {new Date(pr.periodEnd).toLocaleDateString()} |{" "}
                    {pr.employeeIds?.length || 0} employees
                  </p>
                </div>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-[11px] text-primary uppercase">
                  {pr.status}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No payruns created yet. Start a new payrun draft from the payroll
              screen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 4. HR Payroll Manager Dashboard View
function PayrollManagerDashboard({ metrics }: { metrics: any }) {
  const { counts, recentPayruns } = metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Awaiting Manager Sign-Off
            </span>
            <FileCheck className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.computedPayruns}
            </span>
            <span className="text-muted-foreground text-xs">payruns</span>
          </div>
          <p className="mt-1 font-medium text-[11px] text-amber-600">
            Pending validation sign-off
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Validated / Ready to Pay
            </span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.validatedPayruns}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Approved for disbursement
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Total Net Disbursement
            </span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-foreground text-xl">
              ₹{counts.totalNetLiability.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Actual employee payout liability
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Active Warnings
            </span>
            <AlertTriangle className="size-4 text-destructive" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.payslipWarningsCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Missing bank details or calculation anomalies
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-border border-b pb-3">
          <h3 className="font-semibold text-foreground text-sm">
            Validation &amp; Payment Queue
          </h3>
          <Link
            className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
            to="/payroll/payruns"
          >
            Review Payrun Batches <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="mt-2 divide-y divide-border">
          {recentPayruns && recentPayruns.length > 0 ? (
            recentPayruns.map((pr: any) => (
              <div
                className="flex items-center justify-between py-3 text-xs"
                key={pr._id}
              >
                <div>
                  <span className="font-semibold text-foreground">
                    {pr.name}
                  </span>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Batch: {pr._id} &bull; {pr.employeeIds?.length || 0} Payees
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "rounded-md px-2 py-0.5 font-medium text-[11px] uppercase",
                      pr.status === "validated"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : pr.status === "computed"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {pr.status}
                  </span>
                  <Link
                    className="rounded-md border border-border px-2.5 py-1 font-medium text-foreground text-xs transition-colors hover:bg-muted"
                    to="/payroll/payruns"
                  >
                    Examine
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No payruns in pipeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 5. System Admin Dashboard View
function AdminDashboard({ metrics }: { metrics: any }) {
  const { counts } = metrics;

  return (
    <div className="space-y-6">
      {/* Platform Level Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Registered Accounts
            </span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.usersCount}
            </span>
            <span className="text-muted-foreground text-xs">users</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Synchronized system identities
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Salary Structures
            </span>
            <FileText className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.salaryStructuresCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Configured rule engines
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Departments Configured
            </span>
            <Building className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-foreground">
              {counts.departments}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Organizational hierarchy
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs">
              Access Governance
            </span>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-base text-foreground">
              RBAC Enforced
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Self-signups completely locked
          </p>
        </div>
      </div>

      {/* Admin Operations Hub */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-border border-b pb-3">
            <h3 className="font-semibold text-foreground text-sm">
              Role &amp; Identity Governance
            </h3>
            <Link
              className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              to="/admin/users"
            >
              Open User Manager <ArrowRight className="size-3" />
            </Link>
          </div>
          <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
            Assign user roles across the 5-tier hierarchy (Employee &rarr; HR
            Manager &rarr; HR Payroll User &rarr; HR Payroll Manager &rarr;
            Admin). Link accounts to employee records to enable self-service
            payslips and punch records.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
              to="/admin/users"
            >
              <ShieldCheck className="size-3.5" />
              <span>Manage User Roles &amp; Linking</span>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-border border-b pb-3">
            <h3 className="font-semibold text-foreground text-sm">
              System Configuration &amp; Schedules
            </h3>
            <Link
              className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              to="/configuration/working-schedules"
            >
              Configure <ArrowRight className="size-3" />
            </Link>
          </div>
          <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
            Configure working schedules, daily shift hours, break durations, and
            salary computation structures. Changes here directly affect
            attendance calculations and payrun batch evaluations.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground text-xs shadow-xs transition-colors hover:bg-muted"
              to="/configuration/working-schedules"
            >
              <span>Manage Working Schedules</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
