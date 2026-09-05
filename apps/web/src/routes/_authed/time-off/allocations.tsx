import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  Edit2,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/time-off/allocations")({
  component: TimeOffAllocationsPage,
});

function TimeOffAllocationsPage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [formEmpId, setFormEmpId] = useState("");
  const [formTypeId, setFormTypeId] = useState("");
  const [formAmount, setFormAmount] = useState("18");
  const [editingId, setEditingId] = useState<Id<"timeOffAllocations"> | null>(
    null
  );

  // Adjustment dialog
  const [adjustTarget, setAdjustTarget] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("0");
  const [adjustReason, setAdjustReason] = useState("");

  const allocations = useQuery(
    api.timeOffAllocations.list,
    user?.id ? { clerkId: user.id, year: yearFilter } : "skip"
  );

  const employees = useQuery(
    api.employees.listAll,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const timeOffTypes = useQuery(
    api.timeOffTypes.list,
    user?.id ? { clerkId: user.id } : {}
  );

  const createAllocation = useMutation(api.timeOffAllocations.create);
  const updateAllocation = useMutation(api.timeOffAllocations.update);
  const removeAllocation = useMutation(api.timeOffAllocations.remove);
  const adjustBalance = useMutation(api.timeOffAllocations.adjust);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage =
    currentUser?.role &&
    ["admin", "hr_payroll_manager", "hr_manager"].includes(currentUser.role);

  const filteredAllocations = allocations?.filter(
    (a) =>
      !search ||
      a.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      a.typeName?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(formEmpId && formTypeId && formAmount)) {
      toast.error("Please fill all required fields.");
      return;
    }
    const amount = Number(formAmount);
    if (amount <= 0) {
      toast.error("Allocated amount must be positive.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await updateAllocation({
          allocatedAmount: amount,
          id: editingId,
        });
        toast.success("Allocation updated!");
      } else {
        await createAllocation({
          allocatedAmount: amount,
          employeeId: formEmpId as Id<"employees">,
          timeOffTypeId: formTypeId as Id<"timeOffTypes">,
          validFrom: new Date(yearFilter, 0, 1).getTime(),
        });
        toast.success("Allocation created!");
      }
      setIsCreateOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormEmpId("");
    setFormTypeId("");
    setFormAmount("18");
  };

  const startEdit = (a: any) => {
    setEditingId(a._id);
    setFormEmpId(a.employeeId);
    setFormTypeId(a.timeOffTypeId);
    setFormAmount(String(a.allocatedAmount));
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: Id<"timeOffAllocations">) => {
    if (!confirm("Delete this allocation?")) {
      return;
    }
    try {
      await removeAllocation({ clerkId: user?.id, id });
      toast.success("Allocation deleted.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
    }
  };

  const handleAdjust = async () => {
    if (!(adjustTarget && adjustReason.trim())) {
      toast.error("Please provide a reason for the adjustment.");
      return;
    }
    const amount = Number(adjustAmount);
    if (amount === 0) {
      toast.error("Adjustment amount cannot be zero.");
      return;
    }

    try {
      setIsSubmitting(true);
      await adjustBalance({
        adjustment: amount,
        allocationId: adjustTarget._id,
        reason: adjustReason.trim(),
      });
      toast.success(
        `Balance adjusted by ${amount > 0 ? "+" : ""}${amount} days.`
      );
      setAdjustTarget(null);
      setAdjustAmount("0");
      setAdjustReason("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to adjust";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Leave Allocations
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Manage employee leave allocations, balances, and adjustments.
          </p>
        </div>
        {canManage && (
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
            onClick={() => {
              resetForm();
              setEditingId(null);
              setIsCreateOpen(true);
            }}
            type="button"
          >
            <Plus className="size-4" />
            <span>New Allocation</span>
          </button>
        )}
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
            onChange={(e) => setYearFilter(Number(e.target.value))}
            value={yearFilter}
          >
            {[currentYear, currentYear - 1, currentYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border border-b bg-muted/40 font-semibold text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Allocated</th>
                <th className="px-4 py-3 text-right">Adjusted</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAllocations === undefined ? (
                <tr>
                  <td
                    className="p-8 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    <Calendar className="mx-auto size-4 animate-spin opacity-60" />
                  </td>
                </tr>
              ) : filteredAllocations.length === 0 ? (
                <tr>
                  <td
                    className="p-12 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    <AlertCircle className="mx-auto mb-2 size-8 opacity-40" />
                    <p className="font-medium text-foreground">
                      No allocations for {yearFilter}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a) => {
                  const remaining =
                    a.allocatedAmount + (a.adjustedDays ?? 0) - a.takenAmount;
                  return (
                    <tr
                      className="transition-colors hover:bg-muted/20"
                      key={a._id}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {a.employeeName || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {a.typeName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {a.allocatedAmount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={
                            (a.adjustedDays ?? 0) > 0
                              ? "text-emerald-600"
                              : (a.adjustedDays ?? 0) < 0
                                ? "text-rose-600"
                                : "text-muted-foreground"
                          }
                        >
                          {(a.adjustedDays ?? 0) > 0 ? "+" : ""}
                          {a.adjustedDays ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {a.takenAmount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-bold font-mono ${
                            remaining <= 0
                              ? "text-rose-600"
                              : remaining <= 3
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {remaining}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-[11px] capitalize ${
                            a.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => setAdjustTarget(a)}
                              title="Adjust Balance"
                              type="button"
                            >
                              <SlidersHorizontal className="size-3.5" />
                            </button>
                            <button
                              className="p-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => startEdit(a)}
                              title="Edit"
                              type="button"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              className="p-1.5 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(a._id)}
                              title="Delete"
                              type="button"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <h2 className="font-bold text-base text-foreground">
                {editingId ? "Edit Allocation" : "New Allocation"}
              </h2>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingId(null);
                }}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Employee *
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  disabled={!!editingId}
                  onChange={(e) => setFormEmpId(e.target.value)}
                  required
                  value={formEmpId}
                >
                  <option value="">-- Select Employee --</option>
                  {employees?.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Leave Type *
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  disabled={!!editingId}
                  onChange={(e) => setFormTypeId(e.target.value)}
                  required
                  value={formTypeId}
                >
                  <option value="">-- Select Type --</option>
                  {timeOffTypes?.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Allocated Amount *
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  min="1"
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  type="number"
                  value={formAmount}
                />
              </div>

              <div className="flex justify-end gap-3 border-border border-t pt-4">
                <button
                  className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingId(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Dialog */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <h2 className="font-bold text-base text-foreground">
                Adjust Leave Balance
              </h2>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setAdjustTarget(null);
                  setAdjustAmount("0");
                  setAdjustReason("");
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
                  {adjustTarget.employeeName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium text-foreground">
                  {adjustTarget.typeName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Current Balance: </span>
                <span className="font-bold text-foreground">
                  {adjustTarget.remaining} days
                </span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Adjustment (+/- days) *
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  type="number"
                  value={adjustAmount}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Positive to grant extra days, negative to deduct.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Reason *
                </label>
                <textarea
                  className="h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Additional leave granted for exceptional performance."
                  required
                  value={adjustReason}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-border border-t pt-4">
              <button
                className="rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground text-xs hover:bg-muted"
                onClick={() => {
                  setAdjustTarget(null);
                  setAdjustAmount("0");
                  setAdjustReason("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting || !adjustReason.trim()}
                onClick={handleAdjust}
                type="button"
              >
                {isSubmitting ? "Saving..." : "Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
