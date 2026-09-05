import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Edit3,
  FileText,
  Lock,
  Save,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/employees/$employeeId")({
  component: EmployeeDetailPage,
});

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  employee: 1,
  hr_manager: 2,
  hr_payroll_manager: 4,
  hr_payroll_user: 3,
};

export function EmployeeDetailPage() {
  const { employeeId } = Route.useParams();

  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Queries — loaded in parallel by Convex
  const employee = useQuery(
    api.employees.get,
    user?.id ? { clerkId: user.id, id: employeeId as Id<"employees"> } : "skip"
  );
  const stats = useQuery(
    api.employees.getSmartStats,
    user?.id
      ? { clerkId: user.id, employeeId: employeeId as Id<"employees"> }
      : "skip"
  );
  const departments = useQuery(
    api.departments.list,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const schedules = useQuery(
    api.workingSchedules.list,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const allEmployees = useQuery(
    api.employees.listAll,
    user?.id ? { clerkId: user.id } : "skip"
  );
  // Mutations
  const updateWorkDetails = useMutation(api.employees.updateWorkDetails);
  const updatePrivateDetails = useMutation(api.employees.updatePrivateDetails);

  // Edit mode state
  const [editMode, setEditMode] = useState<"off" | "work" | "private">("off");
  const [activeTab, setActiveTab] = useState<"work" | "private">("work");

  // Work Details Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");
  const [scheduleId, setScheduleId] = useState<string>("");
  const [employeeType, setEmployeeType] = useState<
    "full_time" | "part_time" | "contract"
  >("full_time");
  const [status, setStatus] = useState<"active" | "inactive" | "terminated">(
    "active"
  );

  // Private Details Form State
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Populate form when employee loads or edit mode changes
  useEffect(() => {
    if (employee) {
      setName(employee.name || "");
      setEmail(employee.email || "");
      setJobPosition(employee.jobPosition || "");
      setDepartmentId(employee.departmentId || "");
      setManagerId(employee.managerId || "");
      setScheduleId(employee.scheduleId || "");
      setEmployeeType(employee.employeeType || "full_time");
      setStatus(employee.status || "active");
      setPhone(employee.phone || "");
      setAddress(employee.address || "");
      setDateOfBirth(employee.dateOfBirth || "");
      setEmergencyContact(employee.emergencyContact || "");
      setAccountName(employee.bankDetails?.accountName || "");
      setAccountNumber(employee.bankDetails?.accountNumber || "");
      setIfsc(employee.bankDetails?.ifsc || "");
    }
  }, [employee]);

  // Loading state
  if (employee === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-card" />
        <div className="h-96 w-full animate-pulse rounded-xl bg-card" />
      </div>
    );
  }

  if (employee === null) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mb-3 size-10 text-destructive" />
        <h2 className="font-semibold text-foreground text-lg">Not Found</h2>
        <p className="mt-1 text-muted-foreground text-xs">
          This employee record does not exist or you lack access.
        </p>
        <Link
          className="mt-4 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs"
          to="/employees"
        >
          Back to Directory
        </Link>
      </div>
    );
  }

  // Permission checks — hierarchy based
  const myRole = currentUser?.role ?? "employee";
  const myLevel = ROLE_HIERARCHY[myRole] ?? 0;
  const isSelf = employee.isSelf;

  // Can edit work details: HR Manager+ (level >= 2)
  const canEditWork = myLevel >= 2;
  // Can edit private details: self (any role) or Admin (level 5)
  const canEditPrivate = isSelf || myLevel >= 2;

  const cancelEdit = () => {
    setEditMode("off");
    // Reset form to employee values
    if (employee) {
      setName(employee.name || "");
      setEmail(employee.email || "");
      setJobPosition(employee.jobPosition || "");
      setDepartmentId(employee.departmentId || "");
      setManagerId(employee.managerId || "");
      setScheduleId(employee.scheduleId || "");
      setEmployeeType(employee.employeeType || "full_time");
      setStatus(employee.status || "active");
      setPhone(employee.phone || "");
      setAddress(employee.address || "");
      setDateOfBirth(employee.dateOfBirth || "");
      setEmergencyContact(employee.emergencyContact || "");
      setAccountName(employee.bankDetails?.accountName || "");
      setAccountNumber(employee.bankDetails?.accountNumber || "");
      setIfsc(employee.bankDetails?.ifsc || "");
    }
  };

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateWorkDetails({
        departmentId: departmentId
          ? (departmentId as Id<"departments">)
          : undefined,
        email: email.trim(),
        employeeType,
        id: employee._id,
        jobPosition: jobPosition.trim(),
        managerId: managerId ? (managerId as Id<"employees">) : undefined,
        name: name.trim(),
        scheduleId: scheduleId
          ? (scheduleId as Id<"workingSchedules">)
          : undefined,
        status,
      });
      toast.success("Work details saved.");
      setEditMode("off");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const hasBank = accountName.trim() && accountNumber.trim() && ifsc.trim();
      await updatePrivateDetails({
        address: address.trim() || undefined,
        bankDetails: hasBank
          ? {
              accountName: accountName.trim(),
              accountNumber: accountNumber.trim(),
              ifsc: ifsc.trim().toUpperCase(),
            }
          : undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        id: employee._id,
        phone: phone.trim() || undefined,
      });
      toast.success("Private details saved.");
      setEditMode("off");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Manager name
  const managerEmp = allEmployees?.find((e) => e._id === employee.managerId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      {/* Back */}
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
        to="/employees"
      >
        <ArrowLeft className="size-4" />
        Back to Directory
      </Link>

      {/* Profile Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary text-xl">
              {employee.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-bold text-2xl text-foreground tracking-tight">
                  {employee.name}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-[11px] capitalize ${
                    employee.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : employee.status === "inactive"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {employee.status}
                </span>
                {isSelf && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-[10px] text-primary uppercase tracking-wider">
                    You
                  </span>
                )}
              </div>
              <p className="mt-1 font-medium text-muted-foreground text-sm">
                {employee.jobPosition} &bull;{" "}
                {employee.departmentName || "Unassigned"}
                {managerEmp && <> &bull; Reports to {managerEmp.name}</>}
              </p>
            </div>
          </div>

          {/* Smart Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-2xs transition-colors hover:border-primary/50 hover:bg-muted/40"
              to="/contracts"
            >
              <FileText className="size-4 text-primary" />
              <div className="text-left">
                <span className="block font-semibold text-foreground leading-tight">
                  {stats?.contractsCount ?? 0}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  Contracts
                </span>
              </div>
            </Link>
            <Link
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-2xs transition-colors hover:border-primary/50 hover:bg-muted/40"
              to="/attendance"
            >
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
              <div className="text-left">
                <span className="block font-semibold text-foreground leading-tight">
                  {stats?.attendanceCount ?? 0}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  Attendance
                </span>
              </div>
            </Link>
            <Link
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-2xs transition-colors hover:border-primary/50 hover:bg-muted/40"
              to="/time-off/requests"
            >
              <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" />
              <div className="text-left">
                <span className="block font-semibold text-foreground leading-tight">
                  {stats?.timeOffCount ?? 0}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  Time Off
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-border bg-card p-1 shadow-2xs">
        <button
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-semibold text-xs transition-all ${
            activeTab === "work"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("work")}
          type="button"
        >
          <Building2 className="size-4" />
          <span>Work Details</span>
        </button>
        <button
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-semibold text-xs transition-all ${
            activeTab === "private"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("private")}
          type="button"
        >
          <User className="size-4" />
          <span>Private & Banking</span>
          {!canEditPrivate && <Lock className="size-3.5 opacity-60" />}
        </button>
      </div>

      {/* ─── WORK DETAILS ─── */}
      {activeTab === "work" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
            <h2 className="font-bold text-base text-foreground">
              Work & Organizational
            </h2>
            {editMode === "work" ? (
              <div className="flex items-center gap-2">
                <button
                  className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 font-medium text-foreground text-xs hover:bg-muted"
                  onClick={cancelEdit}
                  type="button"
                >
                  <X className="mr-1 inline size-3" />
                  Cancel
                </button>
                <button
                  className="cursor-pointer rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isSaving}
                  form="work-form"
                  type="submit"
                >
                  <Save className="mr-1 inline size-3" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : canEditWork ? (
              <button
                className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 font-medium text-foreground text-xs hover:bg-muted"
                onClick={() => setEditMode("work")}
                type="button"
              >
                <Edit3 className="mr-1 inline size-3" />
                Edit
              </button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                <Lock className="size-3.5" />
                Read-only
              </span>
            )}
          </div>

          <form className="space-y-4" id="work-form" onSubmit={handleSaveWork}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                disabled={editMode !== "work"}
                label="Full Name *"
                onChange={(v) => setName(v)}
                required
                type="text"
                value={name}
              />
              <Field
                disabled={editMode !== "work"}
                label="Work Email *"
                onChange={(v) => setEmail(v)}
                required
                type="email"
                value={email}
              />
              <Field
                disabled={editMode !== "work"}
                label="Job Position *"
                onChange={(v) => setJobPosition(v)}
                required
                type="text"
                value={jobPosition}
              />
              <SelectField
                disabled={editMode !== "work"}
                label="Department *"
                onChange={(v) => setDepartmentId(v)}
                required
                value={departmentId}
              >
                <option value="">— Select —</option>
                {departments?.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                disabled={editMode !== "work"}
                label="Manager"
                onChange={(v) => setManagerId(v)}
                value={managerId}
              >
                <option value="">— None —</option>
                {allEmployees
                  ?.filter((e) => e._id !== employee._id)
                  .map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.jobPosition})
                    </option>
                  ))}
              </SelectField>
              <SelectField
                disabled={editMode !== "work"}
                label="Working Schedule"
                onChange={(v) => setScheduleId(v)}
                value={scheduleId}
              >
                <option value="">— Standard —</option>
                {schedules?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.weeklyHours} hrs/wk)
                  </option>
                ))}
              </SelectField>
              <SelectField
                disabled={editMode !== "work"}
                label="Employment Type"
                onChange={(v) => setEmployeeType(v as any)}
                value={employeeType}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </SelectField>
              <SelectField
                disabled={editMode !== "work"}
                label="Status"
                onChange={(v) => setStatus(v as any)}
                value={status}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </SelectField>
            </div>
          </form>
        </div>
      )}

      {/* ─── PRIVATE DETAILS ─── */}
      {activeTab === "private" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
            <h2 className="font-bold text-base text-foreground">
              Private & Banking
            </h2>
            {editMode === "private" ? (
              <div className="flex items-center gap-2">
                <button
                  className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 font-medium text-foreground text-xs hover:bg-muted"
                  onClick={cancelEdit}
                  type="button"
                >
                  <X className="mr-1 inline size-3" />
                  Cancel
                </button>
                <button
                  className="cursor-pointer rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50"
                  disabled={isSaving}
                  form="private-form"
                  type="submit"
                >
                  <Save className="mr-1 inline size-3" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : canEditPrivate ? (
              <button
                className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 font-medium text-foreground text-xs hover:bg-muted"
                onClick={() => setEditMode("private")}
                type="button"
              >
                <Edit3 className="mr-1 inline size-3" />
                Edit
              </button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-600 dark:text-amber-400">
                <Lock className="size-3.5" />
                Employee self-edit only
              </span>
            )}
          </div>

          <form
            className="space-y-5"
            id="private-form"
            onSubmit={handleSavePrivate}
          >
            <div>
              <h3 className="mb-2 font-semibold text-foreground text-xs uppercase tracking-wider">
                Contact
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  disabled={editMode !== "private"}
                  label="Phone"
                  onChange={(v) => setPhone(v)}
                  placeholder="+91 98765 43210"
                  type="text"
                  value={phone}
                />
                <Field
                  disabled={editMode !== "private"}
                  label="Date of Birth"
                  onChange={(v) => setDateOfBirth(v)}
                  type="date"
                  value={dateOfBirth}
                />
                <Field
                  disabled={editMode !== "private"}
                  label="Emergency Contact"
                  onChange={(v) => setEmergencyContact(v)}
                  placeholder="Name & Number"
                  type="text"
                  value={emergencyContact}
                />
                <Field
                  disabled={editMode !== "private"}
                  label="Address"
                  onChange={(v) => setAddress(v)}
                  placeholder="Street, City, State"
                  type="text"
                  value={address}
                />
              </div>
            </div>

            <div className="border-border border-t pt-4">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  Banking
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field
                  disabled={editMode !== "private"}
                  label="Account Holder"
                  onChange={(v) => setAccountName(v)}
                  placeholder="Full name"
                  type="text"
                  value={accountName}
                />
                <Field
                  disabled={editMode !== "private"}
                  label="Account Number"
                  onChange={(v) => setAccountNumber(v)}
                  placeholder="5010023456789"
                  type="text"
                  value={accountNumber}
                />
                <Field
                  disabled={editMode !== "private"}
                  label="IFSC / Routing"
                  onChange={(v) => setIfsc(v)}
                  placeholder="HDFC0001234"
                  type="text"
                  value={ifsc}
                />
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable field components ─── */
function Field({
  disabled,
  label,
  onChange,
  placeholder,
  required,
  type,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-medium text-foreground text-xs">
        {label}
      </label>
      <input
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </div>
  );
}

function SelectField({
  children,
  disabled,
  label,
  onChange,
  required,
  value,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onChange: (v: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-medium text-foreground text-xs">
        {label}
      </label>
      <select
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        value={value}
      >
        {children}
      </select>
    </div>
  );
}
