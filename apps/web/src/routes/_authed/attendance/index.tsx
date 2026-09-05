import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock,
  Edit2,
  LogIn,
  LogOut,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { statusColors } from "../../../lib/status-colors";

export const Route = createFileRoute("/_authed/attendance/")({
  component: AttendancePage,
});

export function AttendancePage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : {}
  );

  const [dateFilter, setDateFilter] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [isManualOpen, setIsManualOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<any>(null);

  // Queries
  const records = useQuery(
    api.attendance.list,
    currentUser
      ? {
          date: dateFilter || undefined,
          employeeId:
            employeeFilter === "all"
              ? undefined
              : (employeeFilter as Id<"employees">),
          status: statusFilter,
        }
      : "skip"
  );

  const todayStatus = useQuery(
    api.attendance.getTodayStatus,
    currentUser ? {} : "skip"
  );

  const employees = useQuery(
    api.employees.list,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Mutations
  const checkIn = useMutation(api.attendance.checkIn);
  const checkOut = useMutation(api.attendance.checkOut);
  const recordManual = useMutation(api.attendance.recordManual);
  const correctAttendance = useMutation(api.attendance.correctAttendance);
  const ensureDailyRecords = useMutation(api.attendance.ensureDailyRecords);

  // Manual Entry Form State
  const [manualEmpId, setManualEmpId] = useState("");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [manualCheckIn, setManualCheckIn] = useState("09:00");
  const [manualCheckOut, setManualCheckOut] = useState("18:00");
  const [manualStatus, setManualStatus] = useState<
    | "present"
    | "late"
    | "absent"
    | "exception"
    | "overtime"
    | "paid_leave"
    | "unpaid_leave"
    | "scheduled_off"
  >("present");

  // Correction Form State
  const [corrCheckIn, setCorrCheckIn] = useState("");
  const [corrCheckOut, setCorrCheckOut] = useState("");
  const [corrStatus, setCorrStatus] = useState<
    | "present"
    | "late"
    | "absent"
    | "exception"
    | "overtime"
    | "paid_leave"
    | "unpaid_leave"
    | "scheduled_off"
  >("present");

  const [isActionLoading, setIsActionLoading] = useState(false);

  const isEmployeeRole = currentUser?.role === "employee";
  const canManageAttendance =
    currentUser?.role &&
    ["admin", "hr_payroll_manager", "hr_payroll_user", "hr_manager"].includes(
      currentUser.role
    );

  useEffect(() => {
    if (!(currentUser && canManageAttendance)) {
      return;
    }
    const date = dateFilter || new Date().toISOString().split("T")[0];
    ensureDailyRecords({ clerkId: user?.id, date }).catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to materialize daily attendance."
      );
    });
  }, [canManageAttendance, dateFilter, ensureDailyRecords]);

  const handleSelfCheckIn = async () => {
    try {
      setIsActionLoading(true);
      await checkIn({ clerkId: user?.id });
      toast.success("Checked in successfully! Have a great work day.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to check in");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSelfCheckOut = async () => {
    try {
      setIsActionLoading(true);
      await checkOut({ clerkId: user?.id });
      toast.success("Checked out successfully! Work time recorded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to check out");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(manualEmpId && manualDate)) {
      toast.error("Please fill in employee and date.");
      return;
    }

    try {
      setIsActionLoading(true);
      await recordManual({
        checkInTime: manualCheckIn || undefined,
        checkOutTime: manualCheckOut || undefined,
        date: manualDate,
        employeeId: manualEmpId as Id<"employees">,
        status: manualStatus,
      });

      toast.success("Attendance logged successfully!");
      setIsManualOpen(false);
      setManualEmpId("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to log attendance");
    } finally {
      setIsActionLoading(false);
    }
  };

  const openCorrection = (record: any) => {
    setCorrectionTarget(record);
    const cin = record.checkIn
      ? new Date(record.checkIn).toTimeString().substring(0, 5)
      : "09:00";
    const cout = record.checkOut
      ? new Date(record.checkOut).toTimeString().substring(0, 5)
      : "18:00";
    setCorrCheckIn(cin);
    setCorrCheckOut(cout);
    setCorrStatus(record.status);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) {
      return;
    }

    try {
      setIsActionLoading(true);
      await correctAttendance({
        checkInTime: corrCheckIn || undefined,
        checkOutTime: corrCheckOut || undefined,
        id: correctionTarget._id,
        status: corrStatus,
      });

      toast.success("Attendance correction saved!");
      setCorrectionTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save correction");
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredRecords = records?.filter((r) => {
    if (!search) {
      return true;
    }
    const q = search.toLowerCase();
    return (
      r.employeeName?.toLowerCase().includes(q) ||
      r.departmentName?.toLowerCase().includes(q) ||
      r.employeeJob?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header & Quick Action Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Attendance & Time Tracking
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Live check-in/out logging, hours calculation (§8.2), overtime, and
            HR correction audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Self Check-In / Out Button */}
          {currentUser?.employeeId && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 shadow-2xs">
              {todayStatus?.checkIn ? (
                todayStatus.checkOut ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 font-medium text-emerald-600 text-xs">
                    <CheckCircle2 className="size-4" />
                    <span>Completed ({todayStatus.workedMinutes}m)</span>
                  </div>
                ) : (
                  <button
                    className="flex cursor-pointer items-center gap-2 rounded-md bg-rose-600 px-3.5 py-1.5 font-medium text-white text-xs shadow-xs hover:bg-rose-700 disabled:opacity-50"
                    disabled={isActionLoading}
                    onClick={handleSelfCheckOut}
                    type="button"
                  >
                    <LogOut className="size-3.5" />
                    <span>Check Out</span>
                  </button>
                )
              ) : (
                <button
                  className="flex cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-3.5 py-1.5 font-medium text-white text-xs shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isActionLoading}
                  onClick={handleSelfCheckIn}
                  type="button"
                >
                  <LogIn className="size-3.5" />
                  <span>Check In Now</span>
                </button>
              )}
            </div>
          )}

          {canManageAttendance && (
            <button
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
              onClick={() => setIsManualOpen(true)}
              type="button"
            >
              <Plus className="size-4" />
              <span>Log Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name or department..."
            type="text"
            value={search}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-9 rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setDateFilter(e.target.value)}
            type="date"
            value={dateFilter}
          />

          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="exception">Exception (&lt;4h)</option>
            <option value="overtime">Overtime (&gt;9h)</option>
            <option value="paid_leave">Paid leave</option>
            <option value="unpaid_leave">Unpaid leave</option>
            <option value="scheduled_off">Scheduled off</option>
            <option value="paid_leave">Paid leave</option>
            <option value="unpaid_leave">Unpaid leave</option>
            <option value="scheduled_off">Scheduled off</option>
          </select>
          {canManageAttendance && (
            <select
              className="h-9 max-w-52 rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => setEmployeeFilter(e.target.value)}
              value={employeeFilter}
            >
              <option value="all">All employees</option>
              {employees?.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border border-b bg-muted/40 font-semibold text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Check In</th>
                <th className="px-4 py-3">Check Out</th>
                <th className="px-4 py-3">Worked Time</th>
                <th className="px-4 py-3">Status</th>
                {canManageAttendance && (
                  <th className="px-4 py-3 text-right">HR Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords === undefined ? (
                <tr>
                  <td
                    className="p-8 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="size-4 animate-spin" />
                      <span>Loading attendance records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    className="p-12 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    <Clock className="mx-auto mb-2 size-8 opacity-40" />
                    <p className="font-medium text-foreground">
                      No attendance entries found
                    </p>
                    <p className="mt-1 text-xs">
                      Check in or adjust your date/status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    className="transition-colors hover:bg-muted/20"
                    key={r._id}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                          {r.employeeName?.[0] || "E"}
                        </div>
                        <div>
                          <Link
                            className="font-semibold text-foreground hover:underline"
                            params={{ employeeId: r.employeeId }}
                            to="/employees/$employeeId"
                          >
                            {r.employeeName || "Unknown Employee"}
                          </Link>
                          <span className="block text-[10px] text-muted-foreground">
                            {r.departmentName || "General"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-foreground">
                      {new Date(r.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        weekday: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {r.checkIn ? (
                        new Date(r.checkIn).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-muted-foreground/40">--:--</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {r.checkOut ? (
                        new Date(r.checkOut).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-muted-foreground/40">--:--</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-medium font-mono text-foreground">
                      {r.workedMinutes !== undefined && r.workedMinutes > 0 ? (
                        `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m`
                      ) : (
                        <span className="text-muted-foreground/40">0h 0m</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-[11px] capitalize ${statusColors[r.status]}`}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                      {r.correctedByEmail && (
                        <span
                          className="ml-2 text-[10px] text-muted-foreground"
                          title={`Corrected by ${r.correctedByEmail}`}
                        >
                          (edited)
                        </span>
                      )}
                    </td>

                    {canManageAttendance && (
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => openCorrection(r)}
                          type="button"
                        >
                          <Edit2 className="size-3" />
                          <span>Correct</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Dialog */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <h2 className="font-bold text-base text-foreground">
                Manual Attendance Entry
              </h2>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setIsManualOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateManual}>
              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Employee *
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setManualEmpId(e.target.value)}
                  required
                  value={manualEmpId}
                >
                  <option value="">-- Select Employee --</option>
                  {employees?.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} ({e.jobPosition})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Date *
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                  type="date"
                  value={manualDate}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    Check In Time
                  </label>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    type="time"
                    value={manualCheckIn}
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    Check Out Time
                  </label>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    type="time"
                    value={manualCheckOut}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Status
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setManualStatus(e.target.value as any)}
                  value={manualStatus}
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="exception">Exception (&lt;4h)</option>
                  <option value="overtime">Overtime (&gt;9h)</option>
                  <option value="paid_leave">Paid leave</option>
                  <option value="unpaid_leave">Unpaid leave</option>
                  <option value="scheduled_off">Scheduled off</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-border border-t pt-4">
                <button
                  className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                  onClick={() => setIsManualOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isActionLoading}
                  type="submit"
                >
                  {isActionLoading ? "Logging..." : "Log Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Correction Dialog */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <div>
                <h2 className="font-bold text-base text-foreground">
                  HR Attendance Correction
                </h2>
                <p className="text-muted-foreground text-xs">
                  Correct times and status for {correctionTarget.employeeName} (
                  {correctionTarget.date}).
                </p>
              </div>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setCorrectionTarget(null)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSaveCorrection}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    Check In Time
                  </label>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => setCorrCheckIn(e.target.value)}
                    type="time"
                    value={corrCheckIn}
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    Check Out Time
                  </label>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => setCorrCheckOut(e.target.value)}
                    type="time"
                    value={corrCheckOut}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Updated Status
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setCorrStatus(e.target.value as any)}
                  value={corrStatus}
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="exception">Exception (&lt;4h)</option>
                  <option value="overtime">Overtime (&gt;9h)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-border border-t pt-4">
                <button
                  className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                  onClick={() => setCorrectionTarget(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isActionLoading}
                  type="submit"
                >
                  {isActionLoading ? "Saving..." : "Save Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
