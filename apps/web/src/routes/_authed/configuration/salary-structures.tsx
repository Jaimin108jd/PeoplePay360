import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { CircleDollarSign, Edit2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authed/configuration/salary-structures"
)({
  component: SalaryStructuresPage,
});

export function SalaryStructuresPage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const structures = useQuery(
    api.salaryStructures.list,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const createStructure = useMutation(api.salaryStructures.create);
  const updateStructure = useMutation(api.salaryStructures.update);
  const removeStructure = useMutation(api.salaryStructures.remove);

  const canManage = ["admin", "hr_payroll_manager"].includes(
    currentUser?.role ?? ""
  );
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<Id<"salaryStructures"> | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setActive(true);
  };

  const startEdit = (structure: NonNullable<typeof structures>[number]) => {
    setEditingId(structure._id);
    setName(structure.name);
    setActive(structure.active);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a salary structure name.");
      return;
    }

    try {
      setIsSaving(true);
      if (editingId) {
        await updateStructure({
          active,
          id: editingId,
          name: name.trim(),
        });
        toast.success("Salary structure updated.");
      } else {
        await createStructure({
          active,
          name: name.trim(),
        });
        toast.success("Salary structure created.");
      }
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save salary structure."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: Id<"salaryStructures">) => {
    try {
      await removeStructure({ id });
      toast.success("Salary structure deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete salary structure."
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-border border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-medium text-primary text-xs uppercase tracking-[0.2em]">
            Payroll configuration
          </p>
          <h1 className="mt-2 font-semibold text-3xl text-foreground tracking-tight">
            Salary structures
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Define the structures available when creating an employment
            contract.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          <CircleDollarSign className="size-4" />
          {structures?.length ?? 0} structures
        </span>
      </header>

      {canManage && (
        <form
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-end"
          onSubmit={handleSubmit}
        >
          <label className="flex-1 space-y-1.5">
            <span className="font-medium text-foreground text-xs">
              Structure name
            </span>
            <input
              className="field-control"
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Standard India CTC"
              value={name}
            />
          </label>
          <label className="flex h-10 items-center gap-2 px-2 text-foreground text-xs">
            <input
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              type="checkbox"
            />
            Active
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground text-xs disabled:opacity-50"
            disabled={isSaving}
            type="submit"
          >
            {editingId ? (
              <Edit2 className="size-3.5" />
            ) : (
              <Plus className="size-4" />
            )}
            {editingId ? "Save changes" : "Add structure"}
          </button>
          {editingId && (
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-3 text-muted-foreground text-xs hover:bg-muted"
              onClick={resetForm}
              type="button"
            >
              <X className="size-4" />
            </button>
          )}
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-border border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              {canManage && <th className="px-5 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {structures?.map((structure) => (
              <tr className="hover:bg-muted/20" key={structure._id}>
                <td className="px-5 py-4 font-medium text-foreground">
                  {structure.name}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      structure.active
                        ? "status-pill-active"
                        : "status-pill-inactive"
                    }
                  >
                    {structure.active ? "Active" : "Inactive"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => startEdit(structure)}
                        type="button"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(structure._id)}
                        type="button"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {structures?.length === 0 && (
              <tr>
                <td
                  className="px-5 py-12 text-center text-muted-foreground"
                  colSpan={canManage ? 3 : 2}
                >
                  No salary structures yet. Create one here before adding a
                  contract.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
