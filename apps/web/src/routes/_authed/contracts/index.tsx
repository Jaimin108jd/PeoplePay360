import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  FilePenLine,
  FileText,
  List,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { statusColors } from "../../../lib/status-colors";

export const Route = createFileRoute("/_authed/contracts/")({
  component: ContractsPage,
});

type ContractStatus = "draft" | "active" | "expired" | "cancelled";
type ViewMode = "list" | "form";

const EMPTY_FORM = {
  departmentId: "",
  employeeId: "",
  endDate: "",
  position: "",
  salaryStructureId: "",
  startDate: new Date().toISOString().split("T")[0],
  status: "active" as ContractStatus,
  wage: "60000",
};

const formatDate = (timestamp?: number) =>
  timestamp
    ? new Date(timestamp).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Open-ended";

const formatMoney = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-[10px] uppercase tracking-wider ${statusColors[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function ContractsPage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const contracts = useQuery(
    api.contracts.list,
    user?.id ? { clerkId: user.id, status: "all" } : "skip"
  );
  const employees = useQuery(
    api.employees.list,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const departments = useQuery(
    api.departments.list,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const salaryStructures = useQuery(
    api.salaryStructures.list,
    currentUser && currentUser.role !== "employee" ? {} : "skip"
  );

  const createContract = useMutation(api.contracts.create);
  const updateContract = useMutation(api.contracts.update);
  const removeContract = useMutation(api.contracts.remove);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>(
    "all"
  );
  const [selectedId, setSelectedId] = useState<Id<"contracts"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"contracts"> | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageContracts = [
    "admin",
    "hr_payroll_manager",
    "hr_payroll_user",
    "hr_manager",
  ].includes(currentUser?.role ?? "");

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (contracts ?? []).filter((contract) => {
      const matchesStatus =
        statusFilter === "all" || contract.status === statusFilter;
      const matchesSearch =
        !query ||
        [contract.employeeName, contract.position, contract.departmentName]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [contracts, search, statusFilter]);

  const selectedContract =
    contracts?.find((contract) => contract._id === selectedId) ?? null;

  const startCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      salaryStructureId:
        salaryStructures?.find((item) => item.active)?._id ?? "",
    });
    setViewMode("form");
  };

  const startEdit = (contract: NonNullable<typeof contracts>[number]) => {
    setEditingId(contract._id);
    setForm({
      departmentId: contract.departmentId,
      employeeId: contract.employeeId,
      endDate: contract.endDate
        ? new Date(contract.endDate).toISOString().split("T")[0]
        : "",
      position: contract.position,
      salaryStructureId: contract.salaryStructureId,
      startDate: new Date(contract.startDate).toISOString().split("T")[0],
      status: contract.status,
      wage: String(contract.wage),
    });
    setViewMode("form");
  };

  const updateForm = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees?.find((item) => item._id === employeeId);
    setForm((current) => ({
      ...current,
      departmentId: employee?.departmentId ?? current.departmentId,
      employeeId,
      position: employee?.jobPosition ?? current.position,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !(
        form.employeeId &&
        form.departmentId &&
        form.position.trim() &&
        form.salaryStructureId &&
        form.startDate
      ) ||
      Number(form.wage) <= 0
    ) {
      toast.error("Complete the required contract fields before saving.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        departmentId: form.departmentId as Id<"departments">,
        employeeId: form.employeeId as Id<"employees">,
        endDate: form.endDate
          ? new Date(`${form.endDate}T23:59:59`).getTime()
          : undefined,
        position: form.position.trim(),
        salaryStructureId: form.salaryStructureId as Id<"salaryStructures">,
        startDate: new Date(`${form.startDate}T00:00:00`).getTime(),
        status: form.status,
        wage: Number(form.wage),
      };

      if (editingId) {
        await updateContract({ ...payload, clerkId: user?.id, id: editingId });
        toast.success("Contract updated.");
        setSelectedId(editingId);
      } else {
        const id = await createContract(payload);
        toast.success("Contract created.");
        setSelectedId(id);
      }
      setViewMode("list");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save contract."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (
    contract: NonNullable<typeof contracts>[number]
  ) => {
    if (contract.status === "active") {
      toast.error(
        "Active contracts must be cancelled or expired before deletion."
      );
      return;
    }
    if (
      !window.confirm(
        `Delete the contract for ${contract.employeeName ?? "this employee"}?`
      )
    ) {
      return;
    }
    try {
      await removeContract({ clerkId: user?.id, id: contract._id });
      setSelectedId(null);
      toast.success("Contract deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete contract."
      );
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <header className="flex flex-col gap-5 border-border border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-medium text-primary text-xs uppercase tracking-[0.2em]">
            <BriefcaseBusiness className="size-3.5" />
            People operations
          </div>
          <h1 className="font-semibold text-3xl text-foreground tracking-tight">
            Contracts
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
            Keep compensation, position, and contract windows accurate before
            they feed payroll.
          </p>
        </div>
        {canManageContracts && (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground text-xs shadow-sm transition-transform hover:-translate-y-0.5"
            onClick={startCreate}
            type="button"
          >
            <Plus className="size-4" />
            New contract
          </button>
        )}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-border bg-muted/40 p-1">
          <button
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3 font-medium text-xs transition-colors ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("list")}
            type="button"
          >
            <List className="size-3.5" />
            List view
          </button>
          {canManageContracts && (
            <button
              className={`inline-flex h-8 items-center gap-2 rounded-md px-3 font-medium text-xs transition-colors ${viewMode === "form" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={startCreate}
              type="button"
            >
              <FilePenLine className="size-3.5" />
              Form view
            </button>
          )}
        </div>
        <div className="text-muted-foreground text-xs">
          {contracts?.length ?? 0} total contracts
        </div>
      </div>

      {viewMode === "form" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form
            className="rounded-xl border border-border bg-card p-6 shadow-xs"
            onSubmit={handleSubmit}
          >
            <div className="mb-6 flex items-start justify-between border-border border-b pb-5">
              <div>
                <p className="font-medium text-primary text-xs uppercase tracking-wider">
                  {editingId ? "Edit record" : "Create record"}
                </p>
                <h2 className="mt-1 font-semibold text-foreground text-xl">
                  {editingId
                    ? "Update employment contract"
                    : "New employment contract"}
                </h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  Active contracts cannot overlap for the same employee.
                </p>
              </div>
              <button
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setViewMode("list")}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Employee" required>
                <select
                  className="field-control"
                  onChange={(event) => handleEmployeeChange(event.target.value)}
                  required
                  value={form.employeeId}
                >
                  <option value="">Select employee</option>
                  {employees?.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} · {employee.jobPosition}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department" required>
                <select
                  className="field-control"
                  onChange={(event) =>
                    updateForm("departmentId", event.target.value)
                  }
                  required
                  value={form.departmentId}
                >
                  <option value="">Select department</option>
                  {departments?.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Position title" required>
                <input
                  className="field-control"
                  onChange={(event) =>
                    updateForm("position", event.target.value)
                  }
                  placeholder="e.g. Senior Product Designer"
                  required
                  value={form.position}
                />
              </Field>
              <Field label="Salary structure" required>
                <select
                  className="field-control"
                  onChange={(event) =>
                    updateForm("salaryStructureId", event.target.value)
                  }
                  required
                  value={form.salaryStructureId}
                >
                  <option value="">Select salary structure</option>
                  {salaryStructures?.map((structure) => (
                    <option
                      disabled={!structure.active}
                      key={structure._id}
                      value={structure._id}
                    >
                      {structure.name}
                      {structure.active ? "" : " · inactive"}
                    </option>
                  ))}
                </select>
                {salaryStructures?.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    No salary structures exist yet.{" "}
                    <Link
                      className="font-medium text-primary hover:underline"
                      to="/configuration/salary-structures"
                    >
                      Create one in Configuration
                    </Link>
                    .
                  </p>
                )}
              </Field>
              <Field label="Monthly wage" required>
                <div className="relative">
                  <CircleDollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="field-control pl-9 font-mono tabular-nums"
                    min="1"
                    onChange={(event) => updateForm("wage", event.target.value)}
                    required
                    type="number"
                    value={form.wage}
                  />
                </div>
              </Field>
              <Field label="Status" required>
                <select
                  className="field-control"
                  onChange={(event) => updateForm("status", event.target.value)}
                  required
                  value={form.status}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Start date" required>
                <input
                  className="field-control"
                  onChange={(event) =>
                    updateForm("startDate", event.target.value)
                  }
                  required
                  type="date"
                  value={form.startDate}
                />
              </Field>
              <Field label="End date">
                <input
                  className="field-control"
                  onChange={(event) =>
                    updateForm("endDate", event.target.value)
                  }
                  type="date"
                  value={form.endDate}
                />
              </Field>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-border border-t pt-5 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-lg border border-border px-4 font-medium text-foreground text-xs hover:bg-muted"
                onClick={() => setViewMode("list")}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground text-xs disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                <Check className="size-4" />
                {isSubmitting
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create contract"}
              </button>
            </div>
          </form>

          <aside className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="font-semibold text-foreground text-sm">
              Before you save
            </p>
            <div className="mt-4 space-y-4">
              {[
                [
                  "Dates",
                  "The active window must not overlap another active contract.",
                ],
                [
                  "Compensation",
                  "Wage is stored monthly and displayed with tabular INR values.",
                ],
                [
                  "Payroll",
                  "The selected salary structure drives later payslip calculations.",
                ],
              ].map(([title, copy]) => (
                <div className="flex gap-3" key={title}>
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-xs">
                      {title}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="field-control pl-9"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee, position, department..."
                  value={search}
                />
              </div>
              <select
                className="field-control sm:w-40"
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | ContractStatus)
                }
                value={statusFilter}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-xs">
                  <thead className="border-border border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Employee</th>
                      <th className="px-5 py-3 font-semibold">Position</th>
                      <th className="px-5 py-3 font-semibold">Wage</th>
                      <th className="px-5 py-3 font-semibold">Validity</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      {canManageContracts && <th className="px-5 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contracts === undefined ? (
                      <tr>
                        <td
                          className="px-5 py-12 text-center text-muted-foreground"
                          colSpan={6}
                        >
                          Loading contracts...
                        </td>
                      </tr>
                    ) : filteredContracts.length === 0 ? (
                      <tr>
                        <td className="px-5 py-16 text-center" colSpan={6}>
                          <FileText className="mx-auto size-8 text-muted-foreground/50" />
                          <p className="mt-3 font-medium text-foreground">
                            No contracts found
                          </p>
                          <p className="mt-1 text-muted-foreground text-xs">
                            Adjust your search or create a new contract.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredContracts.map((contract) => (
                        <tr
                          className={`cursor-pointer transition-colors hover:bg-muted/30 ${selectedId === contract._id ? "bg-primary/[0.04]" : ""}`}
                          key={contract._id}
                          onClick={() => setSelectedId(contract._id)}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                {contract.employeeName
                                  ?.slice(0, 1)
                                  .toUpperCase() ?? "?"}
                              </div>
                              <div>
                                <Link
                                  className="font-semibold text-foreground hover:text-primary"
                                  onClick={(event) => event.stopPropagation()}
                                  params={{ employeeId: contract.employeeId }}
                                  to="/employees/$employeeId"
                                >
                                  {contract.employeeName ?? "Unknown employee"}
                                </Link>
                                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                  {contract.departmentName ?? "No department"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-foreground">
                              {contract.position}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              {contract.salaryStructureName ?? "No structure"}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold text-foreground tabular-nums">
                            {formatMoney(contract.wage)}
                            <span className="font-normal font-sans text-[10px] text-muted-foreground">
                              {" "}
                              / mo
                            </span>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground tabular-nums">
                            {formatDate(contract.startDate)}{" "}
                            <span className="text-muted-foreground/50">→</span>{" "}
                            {formatDate(contract.endDate)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={contract.status} />
                          </td>
                          {canManageContracts && (
                            <td className="px-5 py-4 text-right">
                              <ChevronRight
                                className={`ml-auto size-4 transition-transform ${selectedId === contract._id ? "translate-x-1 text-primary" : "text-muted-foreground"}`}
                              />
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-xl border border-border bg-card shadow-xs">
            {selectedContract ? (
              <div>
                <div className="border-border border-b p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UserRound className="size-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">
                          {selectedContract.employeeName}
                        </h2>
                        <p className="text-muted-foreground text-xs">
                          {selectedContract.position}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedId(null)}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <StatusBadge status={selectedContract.status} />
                  </div>
                </div>
                <dl className="space-y-4 p-5">
                  <Detail
                    icon={<CircleDollarSign className="size-4" />}
                    label="Monthly wage"
                    value={formatMoney(selectedContract.wage)}
                  />
                  <Detail
                    icon={<BriefcaseBusiness className="size-4" />}
                    label="Department"
                    value={selectedContract.departmentName ?? "—"}
                  />
                  <Detail
                    icon={<FileText className="size-4" />}
                    label="Salary structure"
                    value={selectedContract.salaryStructureName ?? "—"}
                  />
                  <Detail
                    icon={<CalendarDays className="size-4" />}
                    label="Contract window"
                    value={`${formatDate(selectedContract.startDate)} → ${formatDate(selectedContract.endDate)}`}
                  />
                </dl>
                {canManageContracts && (
                  <div className="flex gap-2 border-border border-t p-5">
                    <button
                      className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-border font-medium text-foreground text-xs hover:bg-muted"
                      onClick={() => startEdit(selectedContract)}
                      type="button"
                    >
                      <FilePenLine className="size-3.5" />
                      Edit
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/30 px-3 text-destructive text-xs hover:bg-destructive/10"
                      onClick={() => handleDelete(selectedContract)}
                      type="button"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <ArrowRight className="size-5" />
                </div>
                <p className="mt-4 font-medium text-foreground text-sm">
                  Select a contract
                </p>
                <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                  Choose a row to inspect terms and available actions.
                </p>
              </div>
            )}
          </aside>
        </section>
      )}
    </div>
  );
}

function Field({
  children,
  label,
  required,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block font-medium text-foreground text-xs">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <dt className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </dt>
        <dd className="mt-1 break-words font-medium text-foreground text-xs">
          {value}
        </dd>
      </div>
    </div>
  );
}
