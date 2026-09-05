import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Building2, Edit2, Plus, Save, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/configuration/departments")({
  component: DepartmentsPage,
});

export function DepartmentsPage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : {}
  );
  const departments = useQuery(
    api.departments.list,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const createDepartment = useMutation(api.departments.create);
  const updateDepartment = useMutation(api.departments.update);
  const removeDepartment = useMutation(api.departments.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"departments"> | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage =
    currentUser?.role &&
    ["admin", "hr_payroll_manager", "hr_payroll_user", "hr_manager"].includes(
      currentUser.role
    );

  // Count employees per department from the employees query
  const employees = useQuery(
    api.employees.listAll,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const deptEmployeeCount = (deptId: Id<"departments">) =>
    employees?.filter((e) => e.departmentId === deptId).length ?? 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Department name cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createDepartment({ clerkId: user?.id, name: newName.trim() });
      toast.success("Department created successfully!");
      setIsCreateOpen(false);
      setNewName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (id: Id<"departments">, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = async (id: Id<"departments">) => {
    if (!editName.trim()) {
      toast.error("Department name cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateDepartment({
        id,
        name: editName.trim(),
      });
      toast.success("Department updated successfully!");
      setEditingId(null);
      setEditName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"departments">, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await removeDepartment({ id });
      toast.success(`Department "${name}" deleted.`);
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Failed to delete department — it may still have employees assigned."
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Departments
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage organizational departments. Employees are assigned to
            departments for cost-center tracking and payroll reporting.
          </p>
        </div>

        {canManage && (
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
            onClick={() => setIsCreateOpen(true)}
            type="button"
          >
            <Plus className="size-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments === undefined ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                className="h-36 animate-pulse rounded-xl border border-border bg-card"
                key={i}
              />
            ))}
          </>
        ) : departments.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-3 size-10 opacity-40" />
            <p className="font-semibold text-foreground text-lg">
              No departments configured
            </p>
            <p className="mt-1 text-sm">
              Create your first department to organize employees.
            </p>
          </div>
        ) : (
          departments.map((dept) => {
            const empCount = deptEmployeeCount(dept._id);
            const isEditing = editingId === dept._id;

            return (
              <div
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/30"
                key={dept._id}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="size-5" />
                      </div>
                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              className="h-8 w-48 rounded-lg border border-input bg-background px-3 font-semibold text-foreground text-sm outline-none focus:ring-1 focus:ring-primary"
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveEdit(dept._id);
                                }
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                              type="text"
                              value={editName}
                            />
                            <button
                              className="cursor-pointer rounded-md bg-primary p-1 text-primary-foreground hover:bg-primary/90"
                              onClick={() => handleSaveEdit(dept._id)}
                              title="Save"
                              type="button"
                            >
                              <Save className="size-3.5" />
                            </button>
                            <button
                              className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => setEditingId(null)}
                              title="Cancel"
                              type="button"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <h3 className="font-semibold text-base text-foreground">
                            {dept.name}
                          </h3>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Users className="size-3.5" />
                          <span>
                            {empCount}{" "}
                            {empCount === 1 ? "employee" : "employees"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManage && !isEditing && (
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => handleStartEdit(dept._id, dept.name)}
                          title="Edit department name"
                          type="button"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(dept._id, dept.name)}
                          title="Delete department"
                          type="button"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Department Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <div>
                <h2 className="font-bold text-base text-foreground">
                  Create Department
                </h2>
                <p className="text-muted-foreground text-xs">
                  Add a new organizational department for employee grouping.
                </p>
              </div>
              <button
                className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block font-medium text-foreground text-xs">
                  Department Name *
                </label>
                <input
                  autoFocus
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Engineering, Human Resources, Finance"
                  required
                  type="text"
                  value={newName}
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
                  className="cursor-pointer rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isSubmitting || !newName.trim()}
                  type="submit"
                >
                  {isSubmitting ? "Creating..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
