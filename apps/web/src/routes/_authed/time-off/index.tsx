import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ThumbsDown,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/time-off/")({
  component: TimeOffDashboard,
});

function TimeOffDashboard() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const balances = useQuery(
    api.timeOffAllocations.balance,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const myRequests = useQuery(
    api.timeOffRequests.list,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const timeOffTypes = useQuery(
    api.timeOffTypes.listActive,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const createRequest = useMutation(api.timeOffRequests.create);
  const cancelRequest = useMutation(api.timeOffRequests.cancel);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reqTypeId, setReqTypeId] = useState("");
  const [reqStartDate, setReqStartDate] = useState("");
  const [reqEndDate, setReqEndDate] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(reqTypeId && reqStartDate && reqEndDate)) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (new Date(reqStartDate) > new Date(reqEndDate)) {
      toast.error("Start date must be before end date.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createRequest({
        endDate: new Date(reqEndDate).getTime(),
        reason: reqReason || undefined,
        startDate: new Date(reqStartDate).getTime(),
        timeOffTypeId: reqTypeId as Id<"timeOffTypes">,
      });
      toast.success("Leave request submitted successfully!");
      setIsCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit request";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (requestId: Id<"timeOffRequests">) => {
    if (!confirm("Cancel this leave request?")) {
      return;
    }
    try {
      await cancelRequest({ clerkId: user?.id, requestId });
      toast.success("Request cancelled.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      toast.error(message);
    }
  };

  const resetForm = () => {
    setReqTypeId("");
    setReqStartDate("");
    setReqEndDate("");
    setReqReason("");
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const statusColors: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    cancelled: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    refused: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Time Off
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            View your leave balance and submit time-off requests.
          </p>
        </div>
        <button
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          type="button"
        >
          <Plus className="size-4" />
          <span>Request Time Off</span>
        </button>
      </div>

      {/* Balance Cards */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground text-sm">
          Leave Balance — {currentYear}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {balances === undefined ? (
            <div className="col-span-full p-8 text-center text-muted-foreground">
              <Clock className="mx-auto size-5 animate-spin opacity-60" />
            </div>
          ) : balances.length === 0 ? (
            <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 size-6 opacity-40" />
              <p className="font-medium text-foreground">
                No leave allocations
              </p>
              <p className="mt-1 text-xs">Contact your HR manager.</p>
            </div>
          ) : (
            balances.map((b) => (
              <div
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs"
                key={b._id}
              >
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {b.typeName}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {b.taken} used of {b.allocated}
                    {b.adjustedDays === 0
                      ? ""
                      : ` (${b.adjustedDays > 0 ? "+" : ""}${b.adjustedDays} adj.)`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-2xl text-foreground">
                    {b.remaining}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.unit} left
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* My Requests */}
      <div>
        <h2 className="mb-3 font-semibold text-foreground text-sm">
          My Requests
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border border-b bg-muted/40 font-semibold text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myRequests === undefined ? (
                  <tr>
                    <td
                      className="p-8 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      <Clock className="mx-auto size-4 animate-spin opacity-60" />
                    </td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td
                      className="p-12 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      <Calendar className="mx-auto mb-2 size-8 opacity-40" />
                      <p className="font-medium text-foreground">
                        No requests yet
                      </p>
                      <p className="mt-1 text-xs">
                        Click &quot;Request Time Off&quot; to get started.
                      </p>
                    </td>
                  </tr>
                ) : (
                  myRequests.map((r) => (
                    <tr
                      className="transition-colors hover:bg-muted/20"
                      key={r._id}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.typeName}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatDate(r.startDate)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatDate(r.endDate)}
                      </td>
                      <td className="px-4 py-3 font-medium font-mono text-foreground">
                        {r.duration} {r.unit}
                      </td>
                      <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">
                        {r.reason || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-[11px] capitalize ${statusColors[r.status] ?? ""}`}
                        >
                          {r.status === "pending" && (
                            <Clock className="mr-1 size-3" />
                          )}
                          {r.status === "approved" && (
                            <CheckCircle2 className="mr-1 size-3" />
                          )}
                          {r.status === "refused" && (
                            <ThumbsDown className="mr-1 size-3" />
                          )}
                          {r.status}
                        </span>
                        {r.rejectionReason && (
                          <p className="mt-1 max-w-32 truncate text-[10px] text-rose-500">
                            {r.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "pending" && (
                          <button
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                            onClick={() => handleCancel(r._id)}
                            title="Cancel request"
                            type="button"
                          >
                            <Trash2 className="size-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Request Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <div>
                <h2 className="font-bold text-base text-foreground">
                  Request Time Off
                </h2>
                <p className="text-muted-foreground text-xs">
                  Submit a new leave request for approval.
                </p>
              </div>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Leave Type *
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setReqTypeId(e.target.value)}
                  required
                  value={reqTypeId}
                >
                  <option value="">-- Select Type --</option>
                  {timeOffTypes?.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    Start Date *
                  </label>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => setReqStartDate(e.target.value)}
                    required
                    type="date"
                    value={reqStartDate}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    End Date *
                  </label>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => setReqEndDate(e.target.value)}
                    required
                    type="date"
                    value={reqEndDate}
                  />
                </div>
              </div>

              {reqStartDate && reqEndDate && (
                <div className="rounded-lg bg-primary/10 p-3 text-xs">
                  <span className="font-medium text-foreground">
                    Duration:{" "}
                  </span>
                  <span className="font-bold text-primary">
                    {Math.max(
                      1,
                      Math.ceil(
                        (new Date(reqEndDate).getTime() -
                          new Date(reqStartDate).getTime()) /
                          86_400_000
                      ) + 1
                    )}{" "}
                    day(s)
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Reason
                </label>
                <textarea
                  className="h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="Optional: reason for leave..."
                  value={reqReason}
                />
              </div>

              <div className="flex justify-end gap-3 border-border border-t pt-4">
                <button
                  className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                  onClick={() => setIsCreateOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
