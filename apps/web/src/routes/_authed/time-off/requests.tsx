import { api } from "@PeoplePay360/backend/convex/_generated/api";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  Clock,
  Eye,
  Filter,
  Kanban,
  LayoutList,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "../../../lib/current-user";

export const Route = createFileRoute("/_authed/time-off/requests")({
  component: TimeOffRequestsPage,
});

const COLUMNS = [
  {
    key: "pending",
    label: "Pending",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  {
    key: "approved",
    label: "Approved",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  {
    key: "refused",
    label: "Refused",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
] as const;

const statusColors: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  refused: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function TimeOffRequestsPage() {
  const { user } = useUser();
  const currentUser = useCurrentUser();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("kanban");

  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveComment, setApproveComment] = useState("");
  const [refuseTarget, setRefuseTarget] = useState<any>(null);
  const [refuseReason, setRefuseReason] = useState("");

  const requests = useQuery(
    api.timeOffRequests.list,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const approveRequest = useMutation(api.timeOffRequests.approve);
  const refuseRequest = useMutation(api.timeOffRequests.refuse);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canApprove =
    currentUser?.role &&
    ["admin", "hr_payroll_manager", "hr_payroll_user", "hr_manager"].includes(
      currentUser.role
    );

  const filteredRequests = requests?.filter((r) => {
    const matchesSearch =
      !search ||
      r.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      r.typeName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      setIsSubmitting(true);
      await approveRequest({
        comment: approveComment || undefined,
        requestId: approveTarget._id,
      });
      toast.success(`Approved for ${approveTarget.employeeName}!`);
      setApproveTarget(null);
      setApproveComment("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    if (!refuseTarget || !refuseReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    try {
      setIsSubmitting(true);
      await refuseRequest({
        rejectionReason: refuseReason.trim(),
        requestId: refuseTarget._id,
      });
      toast.success(`Refused for ${refuseTarget.employeeName}.`);
      setRefuseTarget(null);
      setRefuseReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to refuse");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Time Off Requests
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Review and manage employee leave requests.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 self-start rounded-lg border border-border bg-card p-1 sm:self-auto">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "kanban"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Kanban className="size-3.5" /> Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="size-3.5" /> Table
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee or type..."
            type="text"
            value={search}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="refused">Refused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Views */}
      {view === "kanban" ? (
        <KanbanView
          requests={filteredRequests}
          canApprove={!!canApprove}
          onApprove={setApproveTarget}
          onRefuse={setRefuseTarget}
        />
      ) : (
        <TableView
          requests={filteredRequests}
          canApprove={!!canApprove}
          onApprove={setApproveTarget}
          onRefuse={setRefuseTarget}
        />
      )}

      {/* Approve Dialog */}
      {approveTarget && (
        <Dialog
          title="Approve Time Off Request?"
          onClose={() => {
            setApproveTarget(null);
            setApproveComment("");
          }}
        >
          <RequestSummary r={approveTarget} />
          <div className="mb-4">
            <label className="mb-1 block text-muted-foreground text-xs">
              Comment (optional)
            </label>
            <input
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="e.g. Approved. Enjoy your time off!"
              value={approveComment}
            />
          </div>
          <div className="flex justify-end gap-3 border-border border-t pt-4">
            <button
              className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
              onClick={() => {
                setApproveTarget(null);
                setApproveComment("");
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white text-xs hover:bg-emerald-700 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={handleApprove}
              type="button"
            >
              {isSubmitting ? "Approving..." : "Approve"}
            </button>
          </div>
        </Dialog>
      )}

      {/* Refuse Dialog */}
      {refuseTarget && (
        <Dialog
          title="Refuse Time Off Request?"
          onClose={() => {
            setRefuseTarget(null);
            setRefuseReason("");
          }}
        >
          <RequestSummary r={refuseTarget} />
          <div className="mb-4">
            <label className="mb-1 block font-medium text-foreground text-xs">
              Rejection Reason *
            </label>
            <textarea
              className="h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => setRefuseReason(e.target.value)}
              placeholder="e.g. Insufficient staffing during the requested dates."
              value={refuseReason}
            />
          </div>
          <div className="flex justify-end gap-3 border-border border-t pt-4">
            <button
              className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
              onClick={() => {
                setRefuseTarget(null);
                setRefuseReason("");
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-rose-600 px-4 py-2 font-medium text-white text-xs hover:bg-rose-700 disabled:opacity-50"
              disabled={isSubmitting || !refuseReason.trim()}
              onClick={handleRefuse}
              type="button"
            >
              {isSubmitting ? "Refusing..." : "Refuse Request"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({
  requests,
  canApprove,
  onApprove,
  onRefuse,
}: {
  requests: any[] | undefined;
  canApprove: boolean;
  onApprove: (r: any) => void;
  onRefuse: (r: any) => void;
}) {
  if (requests === undefined) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="space-y-3">
            <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const cards = requests.filter((r) => r.status === col.key);
        return (
          <div key={col.key} className="flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${col.dot}`} />
                <span className={`text-xs font-semibold ${col.color}`}>
                  {col.label}
                </span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex min-h-[4rem] flex-col gap-2.5">
              {cards.length === 0 ? (
                <div
                  className={`flex items-center justify-center rounded-xl border-2 border-dashed ${col.border} py-6`}
                >
                  <p className="text-[11px] text-muted-foreground">
                    No requests
                  </p>
                </div>
              ) : (
                cards.map((r) => (
                  <KanbanCard
                    key={r._id}
                    r={r}
                    col={col}
                    canApprove={canApprove}
                    onApprove={onApprove}
                    onRefuse={onRefuse}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  r,
  col,
  canApprove,
  onApprove,
  onRefuse,
}: {
  r: any;
  col: (typeof COLUMNS)[number];
  canApprove: boolean;
  onApprove: (r: any) => void;
  onRefuse: (r: any) => void;
}) {
  return (
    <div
      className={`relative rounded-xl border bg-card p-3.5 shadow-xs transition-shadow hover:shadow-sm ${col.border}`}
    >
      {/* Employee */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {r.employeeName?.[0] ?? "E"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            {r.employeeName ?? "Unknown"}
          </p>
          {r.departmentName && (
            <p className="truncate text-[10px] text-muted-foreground">
              {r.departmentName}
            </p>
          )}
        </div>
      </div>

      {/* Type + duration */}
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${col.bg} ${col.color}`}
        >
          {r.typeName ?? "Leave"}
        </span>
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {r.duration} {r.unit}
        </span>
      </div>

      {/* Dates */}
      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Calendar className="size-3 shrink-0" />
        <span>
          {formatDate(r.startDate)} → {formatDate(r.endDate)}
        </span>
      </div>

      {r.reason && (
        <p className="mb-2.5 truncate text-[10px] italic text-muted-foreground">
          "{r.reason}"
        </p>
      )}

      {r.rejectionReason && (
        <p className="mb-2 truncate text-[10px] text-rose-500">
          ✕ {r.rejectionReason}
        </p>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center justify-between gap-1 border-t border-border pt-2">
        <Link
          to="/time-off/requests/$requestId"
          params={{ requestId: r._id }}
          className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
        >
          <Eye className="size-3" /> View
        </Link>

        {r.status === "pending" && canApprove && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              onClick={() => onApprove(r)}
            >
              <ThumbsUp className="size-3" /> OK
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
              onClick={() => onRefuse(r)}
            >
              <ThumbsDown className="size-3" /> No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  requests,
  canApprove,
  onApprove,
  onRefuse,
}: {
  requests: any[] | undefined;
  canApprove: boolean;
  onApprove: (r: any) => void;
  onRefuse: (r: any) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-border border-b bg-muted/40 font-semibold text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests === undefined ? (
              <tr>
                <td
                  className="p-8 text-center text-muted-foreground"
                  colSpan={8}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="size-4 animate-spin" />
                    <span>Loading requests...</span>
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td
                  className="p-12 text-center text-muted-foreground"
                  colSpan={8}
                >
                  <Calendar className="mx-auto mb-2 size-8 opacity-40" />
                  <p className="font-medium text-foreground">
                    No requests found
                  </p>
                </td>
              </tr>
            ) : (
              requests.map((r) => (
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
                        <span className="font-semibold text-foreground">
                          {r.employeeName || "Unknown"}
                        </span>
                        {r.departmentName && (
                          <span className="block text-[10px] text-muted-foreground">
                            {r.departmentName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.typeName}</td>
                  <td className="px-4 py-3 text-foreground">
                    {formatDate(r.startDate)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatDate(r.endDate)}
                  </td>
                  <td className="px-4 py-3 font-medium font-mono text-foreground">
                    {r.duration} {r.unit}
                  </td>
                  <td className="max-w-32 truncate px-4 py-3 text-muted-foreground">
                    {r.reason || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-[11px] capitalize ${statusColors[r.status] ?? ""}`}
                    >
                      {r.status}
                    </span>
                    {r.rejectionReason && (
                      <p className="mt-1 max-w-32 truncate text-[10px] text-rose-500">
                        {r.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                        params={{ requestId: r._id }}
                        to="/time-off/requests/$requestId"
                      >
                        <Eye className="size-3" />
                      </Link>
                      {r.status === "pending" && canApprove && (
                        <>
                          <button
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            onClick={() => onApprove(r)}
                            type="button"
                          >
                            <ThumbsUp className="size-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                            onClick={() => onRefuse(r)}
                            type="button"
                          >
                            <ThumbsDown className="size-3" />
                            <span>Refuse</span>
                          </button>
                        </>
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
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
          <h2 className="font-bold text-base text-foreground">{title}</h2>
          <button
            className="p-1 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RequestSummary({ r }: { r: any }) {
  return (
    <div className="mb-4 space-y-2 text-sm">
      <SummaryRow label="Employee" value={r.employeeName} />
      <SummaryRow label="Leave" value={r.typeName} />
      <SummaryRow
        label="Dates"
        value={`${formatDate(r.startDate)} → ${formatDate(r.endDate)}`}
      />
      <SummaryRow label="Duration" value={`${r.duration} ${r.unit}`} bold />
      {r.reason && <SummaryRow label="Reason" value={r.reason} />}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span
        className={
          bold ? "font-bold text-foreground" : "font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
