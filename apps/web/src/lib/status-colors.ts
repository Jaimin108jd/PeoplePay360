/**
 * Single source of truth for status → badge variant mapping.
 * Every Badge in the app must use these — no ad-hoc color classes on status text.
 */

export type PayrunStatus = "draft" | "computed" | "validated" | "paid";
export type PayslipStatus = PayrunStatus;
export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "exception"
  | "overtime"
  | "paid_leave"
  | "unpaid_leave"
  | "scheduled_off";
export type TimeOffStatus = "pending" | "approved" | "refused";
export type ContractStatus = "draft" | "active" | "expired" | "cancelled";
export type EmployeeStatus = "active" | "inactive" | "terminated";

/** Badge className for each status — use with the Badge component */
export const statusColors = {
  absent:
    "bg-destructive/10 text-red-700 dark:bg-destructive/20 dark:text-red-300",

  // Contract
  active: "bg-success/15 text-green-700 dark:bg-success/20 dark:text-green-300",
  approved:
    "bg-success/15 text-green-700 dark:bg-success/20 dark:text-green-300",
  cancelled:
    "bg-destructive/10 text-red-700 dark:bg-destructive/20 dark:text-red-300",
  computed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  // Payrun / Payslip
  draft: "bg-muted text-muted-foreground",
  exception:
    "bg-destructive/10 text-red-700 dark:bg-destructive/20 dark:text-red-300",
  expired: "bg-muted text-muted-foreground",

  // Employee
  inactive: "bg-muted text-muted-foreground",
  late: "bg-warning/15 text-amber-700 dark:bg-warning/20 dark:text-amber-300",
  overtime: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  paid: "bg-success/15 text-green-700 dark:bg-success/20 dark:text-green-300",
  paid_leave:
    "bg-success/15 text-green-700 dark:bg-success/20 dark:text-green-300",

  // Time off
  pending:
    "bg-warning/15 text-amber-700 dark:bg-warning/20 dark:text-amber-300",

  // Attendance
  present:
    "bg-success/15 text-green-700 dark:bg-success/20 dark:text-green-300",
  refused:
    "bg-destructive/10 text-red-700 dark:bg-destructive/20 dark:text-red-300",
  scheduled_off: "bg-muted text-muted-foreground",
  terminated:
    "bg-destructive/10 text-red-700 dark:bg-destructive/20 dark:text-red-300",
  unpaid_leave:
    "bg-destructive/10 text-red-700 dark:bg-destructive/20 dark:text-red-300",
  validated:
    "bg-warning/15 text-amber-700 dark:bg-warning/20 dark:text-amber-300",
} as const satisfies Record<string, string>;
