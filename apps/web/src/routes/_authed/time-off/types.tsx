import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock,
  Edit2,
  EyeOff,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/time-off/types")({
  component: TimeOffTypesPage,
});

function TimeOffTypesPage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const types = useQuery(
    api.timeOffTypes.list,
    user?.id ? { clerkId: user.id } : {}
  );

  const createType = useMutation(api.timeOffTypes.create);
  const updateType = useMutation(api.timeOffTypes.update);
  const removeType = useMutation(api.timeOffTypes.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"timeOffTypes"> | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState<"days" | "hours">("days");
  const [isPaid, setIsPaid] = useState(true);
  const [requiresBalance, setRequiresBalance] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [defaultAllocation, setDefaultAllocation] = useState("12");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage =
    currentUser?.role &&
    ["admin", "hr_payroll_manager", "hr_manager"].includes(currentUser.role);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a type name.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = {
        defaultAllocation: defaultAllocation
          ? Number(defaultAllocation)
          : undefined,
        description: description || undefined,
        isActive,
        isPaid,
        name: name.trim(),
        requiresApproval,
        requiresBalance,
        unit,
      };

      if (editingId) {
        await updateType({ ...data, clerkId: user?.id, id: editingId });
        toast.success("Time-off type updated!");
      } else {
        await createType(data);
        toast.success("Time-off type created!");
      }
      setIsCreateOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save type";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setUnit("days");
    setIsPaid(true);
    setRequiresBalance(true);
    setRequiresApproval(true);
    setIsActive(true);
    setDefaultAllocation("12");
  };

  const startEdit = (t: any) => {
    setEditingId(t._id);
    setName(t.name);
    setDescription(t.description ?? "");
    setUnit(t.unit);
    setIsPaid(t.isPaid);
    setRequiresBalance(t.requiresBalance);
    setRequiresApproval(t.requiresApproval);
    setIsActive(t.isActive);
    setDefaultAllocation(String(t.defaultAllocation ?? ""));
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: Id<"timeOffTypes">) => {
    if (!confirm("Delete this time-off type?")) {
      return;
    }
    try {
      await removeType({ clerkId: user?.id, id });
      toast.success("Type deleted.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Leave Types
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Configure leave categories, approval requirements, and balance
            rules.
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
            <span>New Type</span>
          </button>
        )}
      </div>

      {/* Types Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {types === undefined ? (
          <div className="col-span-full p-12 text-center text-muted-foreground">
            <Clock className="mx-auto size-6 animate-spin opacity-60" />
          </div>
        ) : types.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            <Tags className="mx-auto mb-2 size-8 opacity-40" />
            <p className="font-semibold text-foreground">No leave types</p>
          </div>
        ) : (
          types.map((t) => (
            <div
              className={`flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs ${
                t.isActive ? "border-border" : "border-border opacity-60"
              }`}
              key={t._id}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base text-foreground">
                        {t.name}
                      </h2>
                      {!t.isActive && (
                        <EyeOff className="size-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-[11px] text-primary capitalize">
                        {t.unit}
                      </span>
                      {t.isPaid && (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-[11px] text-emerald-600">
                          Paid
                        </span>
                      )}
                      {!t.isPaid && (
                        <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 font-semibold text-[11px] text-rose-600">
                          Unpaid
                        </span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(t)}
                        title="Edit"
                        type="button"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(t._id)}
                        title="Delete"
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>

                {t.description && (
                  <p className="mt-2 text-muted-foreground text-xs">
                    {t.description}
                  </p>
                )}

                <div className="mt-4 space-y-2 border-border border-t pt-3">
                  {t.defaultAllocation !== undefined &&
                    t.defaultAllocation !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Default Allocation
                        </span>
                        <span className="font-medium text-foreground">
                          {t.defaultAllocation} {t.unit}
                        </span>
                      </div>
                    )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Requires Approval
                    </span>
                    {t.requiresApproval ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Requires Balance
                    </span>
                    {t.requiresBalance ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <h2 className="font-bold text-base text-foreground">
                {editingId ? "Edit Leave Type" : "New Leave Type"}
              </h2>
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
                  Name *
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paid Annual Leave"
                  required
                  type="text"
                  value={name}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Description
                </label>
                <textarea
                  className="h-14 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  value={description}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    Unit *
                  </label>
                  <select
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) =>
                      setUnit(e.target.value as "days" | "hours")
                    }
                    value={unit}
                  >
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-foreground text-xs">
                    Default Allocation
                  </label>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                    min="0"
                    onChange={(e) => setDefaultAllocation(e.target.value)}
                    placeholder="e.g. 12"
                    type="number"
                    value={defaultAllocation}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 text-xs">
                  <input
                    checked={isPaid}
                    className="rounded border-input text-primary"
                    onChange={(e) => setIsPaid(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-foreground">Paid leave</span>
                </label>
                <label className="flex items-center gap-3 text-xs">
                  <input
                    checked={requiresBalance}
                    className="rounded border-input text-primary"
                    onChange={(e) => setRequiresBalance(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-foreground">
                    Requires pre-allocated balance
                  </span>
                </label>
                <label className="flex items-center gap-3 text-xs">
                  <input
                    checked={requiresApproval}
                    className="rounded border-input text-primary"
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-foreground">Requires HR approval</span>
                </label>
                <label className="flex items-center gap-3 text-xs">
                  <input
                    checked={isActive}
                    className="rounded border-input text-primary"
                    onChange={(e) => setIsActive(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-foreground">
                    Active (available to employees)
                  </span>
                </label>
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
                  {isSubmitting
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
