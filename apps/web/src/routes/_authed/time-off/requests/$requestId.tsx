import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/time-off/requests/$requestId")({
  component: TimeOffRequestDetailPage,
});

function TimeOffRequestDetailPage() {
  const { requestId } = Route.useParams();
  const { user } = useUser();
  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const request = useQuery(api.timeOffRequests.get, {
    requestId: requestId as Id<"timeOffRequests">,
  });

  const approveRequest = useMutation(api.timeOffRequests.approve);
  const refuseRequest = useMutation(api.timeOffRequests.refuse);

  const [showApprove, setShowApprove] = useState(false);
  const [showRefuse, setShowRefuse] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [refuseReason, setRefuseReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canApprove =
    currentUser?.role &&
    ["admin", "hr_payroll_manager", "hr_payroll_user", "hr_manager"].includes(
      currentUser.role
    );

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("en-IN", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    });

  const statusColors: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    cancelled: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    refused: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  const actionIcons: Record<string, typeof Clock> = {
    approved: CheckCircle2,
    cancelled: X,
    request_created: FileText,
    refused: ThumbsDown,
  };

  const actionColors: Record<string, string> = {
    approved: "bg-emerald-500",
    cancelled: "bg-muted",
    request_created: "bg-primary",
    refused: "bg-rose-500",
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await approveRequest({
        comment: approveComment || undefined,
        requestId: requestId as Id<"timeOffRequests">,
      });
      toast.success("Request approved!");
      setShowApprove(false);
      setApproveComment("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    if (!refuseReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    try {
      setIsSubmitting(true);
      await refuseRequest({
        rejectionReason: refuseReason.trim(),
        requestId: requestId as Id<"timeOffRequests">,
      });
      toast.success("Request refused.");
      setShowRefuse(false);
      setRefuseReason("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to refuse";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (request === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Clock className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <AlertCircle className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="font-medium text-foreground">Request not found</p>
        <Link
          className="mt-4 inline-flex items-center gap-2 text-primary text-sm hover:underline"
          to="/time-off/requests"
        >
          <ArrowLeft className="size-4" />
          Back to requests
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      {/* Back link */}
      <Link
        className="inline-flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
        to="/time-off/requests"
      >
        <ArrowLeft className="size-3.5" />
        Back to Requests
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Leave Request
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium text-xs capitalize ${statusColors[request.status] ?? ""}`}
            >
              {request.status}
            </span>
            <span className="text-muted-foreground text-xs">
              Submitted {formatDate(request.startDate)}
            </span>
          </div>
        </div>

        {request.status === "pending" && canApprove && (
          <div className="flex items-center gap-2">
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white text-xs shadow-xs hover:bg-emerald-700"
              onClick={() => setShowApprove(true)}
              type="button"
            >
              <ThumbsUp className="size-4" />
              Approve
            </button>
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-medium text-white text-xs shadow-xs hover:bg-rose-700"
              onClick={() => setShowRefuse(true)}
              type="button"
            >
              <ThumbsDown className="size-4" />
              Refuse
            </button>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Employee Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">Employee</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-foreground">
                {request.employeeName}
              </span>
            </div>
            {request.employeePosition && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position</span>
                <span className="text-foreground">
                  {request.employeePosition}
                </span>
              </div>
            )}
            {request.departmentName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="text-foreground">
                  {request.departmentName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Leave Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">
              Leave Details
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium text-foreground">
                {request.typeName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date</span>
              <span className="text-foreground">
                {formatDate(request.startDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date</span>
              <span className="text-foreground">
                {formatDate(request.endDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-bold text-foreground">
                {request.duration} {request.unit}
              </span>
            </div>
            {request.reason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason</span>
                <span className="max-w-40 text-right text-foreground">
                  {request.reason}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Processing Info */}
      {request.processorEmail && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">
              Processing
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {request.status === "approved" ? "Approved By" : "Processed By"}
              </span>
              <span className="text-foreground">{request.processorEmail}</span>
            </div>
            {request.processedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processed At</span>
                <span className="text-foreground">
                  {formatDateTime(request.processedAt)}
                </span>
              </div>
            )}
            {request.rejectionReason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rejection Reason</span>
                <span className="max-w-48 text-right text-rose-600">
                  {request.rejectionReason}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action History Timeline */}
      {request.history && request.history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h3 className="mb-4 font-semibold text-foreground text-sm">
            Action History
          </h3>
          <div className="space-y-0">
            {request.history.map((h, i) => {
              const Icon = actionIcons[h.action] || Clock;
              const dotColor = actionColors[h.action] || "bg-muted";
              return (
                <div className="flex gap-3" key={h._id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${dotColor} text-white`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    {i < request.history.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="font-medium text-foreground text-xs capitalize">
                      {h.action.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      By {h.actorEmail || "System"} •{" "}
                      {formatDateTime(h._creationTime)}
                    </p>
                    {h.comment && (
                      <p className="mt-1 rounded-md bg-muted/50 p-2 text-[11px] text-foreground">
                        {h.comment}
                      </p>
                    )}
                    {h.previousStatus && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Status: {h.previousStatus} → {h.newStatus}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      {showApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <h2 className="font-bold text-base text-foreground">
                Approve Time Off?
              </h2>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowApprove(false);
                  setApproveComment("");
                }}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-4 space-y-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">Employee: </span>
                <span className="font-medium text-foreground">
                  {request.employeeName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Leave: </span>
                <span className="font-medium text-foreground">
                  {request.typeName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Dates: </span>
                <span className="font-medium text-foreground">
                  {formatDate(request.startDate)} →{" "}
                  {formatDate(request.endDate)}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold text-foreground">
                  {request.duration} {request.unit}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-muted-foreground text-xs">
                Comment (optional)
              </label>
              <input
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="e.g. Enjoy your time off!"
                value={approveComment}
              />
            </div>

            <div className="flex justify-end gap-3 border-border border-t pt-4">
              <button
                className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                onClick={() => {
                  setShowApprove(false);
                  setApproveComment("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white text-xs shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                disabled={isSubmitting}
                onClick={handleApprove}
                type="button"
              >
                {isSubmitting ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refuse Dialog */}
      {showRefuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <h2 className="font-bold text-base text-foreground">
                Refuse Time Off?
              </h2>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowRefuse(false);
                  setRefuseReason("");
                }}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-4 space-y-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">Employee: </span>
                <span className="font-medium text-foreground">
                  {request.employeeName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Leave: </span>
                <span className="font-medium text-foreground">
                  {request.typeName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Dates: </span>
                <span className="font-medium text-foreground">
                  {formatDate(request.startDate)} →{" "}
                  {formatDate(request.endDate)}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block font-medium text-foreground text-xs">
                Rejection Reason *
              </label>
              <textarea
                className="h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                onChange={(e) => setRefuseReason(e.target.value)}
                placeholder="e.g. Insufficient staffing during the requested dates."
                required
                value={refuseReason}
              />
            </div>

            <div className="flex justify-end gap-3 border-border border-t pt-4">
              <button
                className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                onClick={() => {
                  setShowRefuse(false);
                  setRefuseReason("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 font-medium text-white text-xs shadow-xs hover:bg-rose-700 disabled:opacity-50"
                disabled={isSubmitting || !refuseReason.trim()}
                onClick={handleRefuse}
                type="button"
              >
                {isSubmitting ? "Refusing..." : "Refuse Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
