import { api } from "@PeoplePay360/backend/convex/_generated/api";
import type { Id } from "@PeoplePay360/backend/convex/_generated/dataModel";
import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Calendar, Clock, Edit2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authed/configuration/working-schedules"
)({
  component: WorkingSchedulesPage,
});

const DAYS_OF_WEEK = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
  { day: 0, label: "Sunday" },
];

export function WorkingSchedulesPage() {
  const { user } = useUser();

  const currentUser = useQuery(
    api.users.me,
    user?.id ? { clerkId: user.id } : {}
  );
  const schedules = useQuery(
    api.workingSchedules.list,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const createSchedule = useMutation(api.workingSchedules.create);
  const updateSchedule = useMutation(api.workingSchedules.update);
  const removeSchedule = useMutation(api.workingSchedules.remove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] =
    useState<Id<"workingSchedules"> | null>(null);
  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<
    Array<{
      breakMinutes: number;
      dayOfWeek: number;
      endTime: string;
      startTime: string;
    }>
  >([
    { breakMinutes: 60, dayOfWeek: 1, endTime: "18:00", startTime: "09:00" },
    { breakMinutes: 60, dayOfWeek: 2, endTime: "18:00", startTime: "09:00" },
    { breakMinutes: 60, dayOfWeek: 3, endTime: "18:00", startTime: "09:00" },
    { breakMinutes: 60, dayOfWeek: 4, endTime: "18:00", startTime: "09:00" },
    { breakMinutes: 60, dayOfWeek: 5, endTime: "18:00", startTime: "09:00" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage =
    currentUser?.role &&
    ["admin", "hr_payroll_manager", "hr_manager"].includes(currentUser.role);

  // Compute live preview of weekly hours (§8.2)
  const computePreviewHours = () =>
    selectedDays.reduce((total, d) => {
      const [sh, sm] = d.startTime.split(":").map(Number);
      const [eh, em] = d.endTime.split(":").map(Number);
      const diffMins = eh * 60 + em - (sh * 60 + sm) - d.breakMinutes;
      return total + Math.max(0, diffMins / 60);
    }, 0);

  const handleToggleDay = (dayIndex: number) => {
    const exists = selectedDays.some((d) => d.dayOfWeek === dayIndex);
    if (exists) {
      setSelectedDays(selectedDays.filter((d) => d.dayOfWeek !== dayIndex));
    } else {
      setSelectedDays([
        ...selectedDays,
        {
          breakMinutes: 60,
          dayOfWeek: dayIndex,
          endTime: "18:00",
          startTime: "09:00",
        },
      ]);
    }
  };

  const handleDayFieldChange = (
    dayIndex: number,
    field: "startTime" | "endTime" | "breakMinutes",
    value: any
  ) => {
    setSelectedDays(
      selectedDays.map((d) =>
        d.dayOfWeek === dayIndex ? { ...d, [field]: value } : d
      )
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a schedule name.");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Please select at least one working day.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingScheduleId) {
        await updateSchedule({
          days: selectedDays,
          id: editingScheduleId,
          name: name.trim(),
        });
        toast.success("Working schedule updated successfully!");
      } else {
        await createSchedule({
          days: selectedDays,
          name: name.trim(),
        });
        toast.success("Working schedule created successfully!");
      }
      setIsCreateOpen(false);
      setEditingScheduleId(null);
      setName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (schedule: NonNullable<typeof schedules>[number]) => {
    setEditingScheduleId(schedule._id);
    setName(schedule.name);
    setSelectedDays(
      schedule.days.map((day) => ({
        breakMinutes: day.breakMinutes,
        dayOfWeek: day.dayOfWeek,
        endTime: day.endTime,
        startTime: day.startTime,
      }))
    );
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: Id<"workingSchedules">) => {
    if (!confirm("Are you sure you want to delete this working schedule?")) {
      return;
    }
    try {
      await removeSchedule({ clerkId: user?.id, id });
      toast.success("Schedule deleted.");
    } catch (err: any) {
      toast.error(err?.message || "Cannot delete schedule");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            Working Schedules
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Configurable standard weekly work shifts with automated weekly
            working hours calculation (§8.2).
          </p>
        </div>

        {canManage && (
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-xs transition-colors hover:bg-primary/90"
            onClick={() => {
              setEditingScheduleId(null);
              setName("");
              setSelectedDays([
                {
                  breakMinutes: 60,
                  dayOfWeek: 1,
                  endTime: "18:00",
                  startTime: "09:00",
                },
                {
                  breakMinutes: 60,
                  dayOfWeek: 2,
                  endTime: "18:00",
                  startTime: "09:00",
                },
                {
                  breakMinutes: 60,
                  dayOfWeek: 3,
                  endTime: "18:00",
                  startTime: "09:00",
                },
                {
                  breakMinutes: 60,
                  dayOfWeek: 4,
                  endTime: "18:00",
                  startTime: "09:00",
                },
                {
                  breakMinutes: 60,
                  dayOfWeek: 5,
                  endTime: "18:00",
                  startTime: "09:00",
                },
              ]);
              setIsCreateOpen(true);
            }}
            type="button"
          >
            <Plus className="size-4" />
            <span>Create Schedule</span>
          </button>
        )}
      </div>

      {/* Grid of Schedules */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {schedules === undefined ? (
          <div className="col-span-2 p-12 text-center text-muted-foreground">
            <Clock className="mx-auto size-6 animate-spin opacity-60" />
            <p className="mt-2 text-xs">Loading working schedules...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-2 size-8 opacity-40" />
            <p className="font-semibold text-foreground">
              No working schedules configured
            </p>
            <p className="mt-1 text-xs">
              Click &quot;Create Schedule&quot; to configure working days and
              hours.
            </p>
          </div>
        ) : (
          schedules.map((s) => (
            <div
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs"
              key={s._id}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-base text-foreground">
                      {s.name}
                    </h2>
                    <span className="mt-1 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-[11px] text-primary">
                      {s.weeklyHours} hrs / week
                    </span>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(s)}
                        title="Edit Schedule"
                        type="button"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(s._id)}
                        title="Delete Schedule"
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Day Rows */}
                <div className="mt-4 space-y-1.5 border-border border-t pt-3">
                  {s.days?.map((d) => {
                    const dayObj = DAYS_OF_WEEK.find(
                      (w) => w.day === d.dayOfWeek
                    );
                    return (
                      <div
                        className="flex items-center justify-between text-xs"
                        key={d._id}
                      >
                        <span className="font-medium text-foreground">
                          {dayObj?.label}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {d.startTime} - {d.endTime} ({d.breakMinutes}m break)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
              <div>
                <h2 className="font-bold text-base text-foreground">
                  {editingScheduleId
                    ? "Edit Working Schedule"
                    : "Create Working Schedule"}
                </h2>
                <p className="text-muted-foreground text-xs">
                  Weekly hours will be computed automatically (§8.2).
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
                  Schedule Name *
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Full-Time (40h)"
                  required
                  type="text"
                  value={name}
                />
              </div>

              {/* Day Selector */}
              <div>
                <label className="mb-2 block font-medium text-foreground text-xs">
                  Working Days & Shift Hours
                </label>
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  {DAYS_OF_WEEK.map(({ day, label }) => {
                    const dayConfig = selectedDays.find(
                      (d) => d.dayOfWeek === day
                    );
                    const isSelected = !!dayConfig;

                    return (
                      <div
                        className="flex items-center justify-between gap-2"
                        key={day}
                      >
                        <label className="flex items-center gap-2 font-medium text-foreground text-xs">
                          <input
                            checked={isSelected}
                            className="rounded border-input text-primary"
                            onChange={() => handleToggleDay(day)}
                            type="checkbox"
                          />
                          <span className="w-20">{label}</span>
                        </label>

                        {isSelected && dayConfig ? (
                          <div className="flex items-center gap-2 text-xs">
                            <input
                              className="h-7 w-20 rounded border border-input bg-background px-1 text-center font-mono text-xs"
                              onChange={(e) =>
                                handleDayFieldChange(
                                  day,
                                  "startTime",
                                  e.target.value
                                )
                              }
                              type="time"
                              value={dayConfig.startTime}
                            />
                            <span>to</span>
                            <input
                              className="h-7 w-20 rounded border border-input bg-background px-1 text-center font-mono text-xs"
                              onChange={(e) =>
                                handleDayFieldChange(
                                  day,
                                  "endTime",
                                  e.target.value
                                )
                              }
                              type="time"
                              value={dayConfig.endTime}
                            />
                            <input
                              className="h-7 w-14 rounded border border-input bg-background px-1 text-center font-mono text-xs"
                              min={0}
                              onChange={(e) =>
                                handleDayFieldChange(
                                  day,
                                  "breakMinutes",
                                  Number(e.target.value)
                                )
                              }
                              placeholder="brk (m)"
                              title="Break in minutes"
                              type="number"
                              value={dayConfig.breakMinutes}
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">
                            Off
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Computed Live Summary */}
              <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3 text-xs">
                <span className="font-medium text-foreground">
                  Computed Weekly Total:
                </span>
                <span className="font-bold text-primary">
                  {computePreviewHours().toFixed(1)} Hours / Week
                </span>
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
                    : editingScheduleId
                      ? "Save Changes"
                      : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
