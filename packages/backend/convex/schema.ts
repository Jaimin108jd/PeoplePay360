import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  attendance: defineTable({
    checkIn: v.optional(v.number()),
    checkOut: v.optional(v.number()),
    correctedBy: v.optional(v.id("users")),
    date: v.string(), // "2026-08-01", one row per employee per day
    employeeId: v.id("employees"),
    status: v.union(
      v.literal("present"),
      v.literal("late"),
      v.literal("absent"),
      v.literal("exception"),
      v.literal("overtime"),
      v.literal("paid_leave"),
      v.literal("unpaid_leave"),
      v.literal("scheduled_off")
    ),
    workedMinutes: v.optional(v.number()),
  }).index("by_employee_date", ["employeeId", "date"]),

  contracts: defineTable({
    departmentId: v.id("departments"),
    employeeId: v.id("employees"),
    endDate: v.optional(v.number()), // open-ended if absent
    position: v.string(),
    salaryStructureId: v.id("salaryStructures"),
    startDate: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    wage: v.number(),
  }).index("by_employee_start", ["employeeId", "startDate"]),

  departments: defineTable({ name: v.string() }),

  employees: defineTable({
    address: v.optional(v.string()),
    bankDetails: v.optional(
      v.object({
        accountName: v.string(),
        accountNumber: v.string(),
        ifsc: v.string(),
      })
    ),
    dateOfBirth: v.optional(v.string()),
    departmentId: v.id("departments"),
    email: v.string(),
    emergencyContact: v.optional(v.string()),
    employeeType: v.union(
      v.literal("full_time"),
      v.literal("part_time"),
      v.literal("contract")
    ),
    jobPosition: v.string(),
    managerId: v.optional(v.id("employees")),
    name: v.string(),
    phone: v.optional(v.string()),
    scheduleId: v.optional(v.id("workingSchedules")),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("terminated")
    ),
  })
    .index("by_department", ["departmentId"])
    .index("by_manager", ["managerId"])
    .index("by_status", ["status"]),

  // Balance adjustment audit trail
  leaveBalanceAdjustments: defineTable({
    adjustedBy: v.id("users"),
    adjustment: v.number(), // +N or -N
    allocationId: v.id("timeOffAllocations"),
    employeeId: v.id("employees"),
    previousAdjustedDays: v.number(),
    reason: v.string(),
    timeOffTypeId: v.id("timeOffTypes"),
  })
    .index("by_allocation", ["allocationId"])
    .index("by_employee", ["employeeId"]),

  payruns: defineTable({
    createdBy: v.id("users"),
    employeeIds: v.array(v.id("employees")),
    name: v.string(),
    periodEnd: v.number(),
    periodStart: v.number(),
    salaryStructureId: v.id("salaryStructures"),
    status: v.union(
      v.literal("draft"),
      v.literal("computed"),
      v.literal("validated"),
      v.literal("paid")
    ),
  }).index("by_period", ["periodStart", "periodEnd"]),

  payslipLines: defineTable({
    amount: v.number(),
    category: v.string(),
    code: v.string(),
    name: v.string(),
    payslipId: v.id("payslips"),
    salaryRuleId: v.id("salaryRules"),
    sequence: v.number(),
  }).index("by_payslip", ["payslipId"]),

  payslips: defineTable({
    contractId: v.id("contracts"),
    deductions: v.number(),
    employeeId: v.id("employees"),
    gross: v.number(),
    net: v.number(),
    payrunId: v.id("payruns"),
    pdfStorageId: v.optional(v.id("_storage")),
    salaryStructureId: v.id("salaryStructures"),
    status: v.union(
      v.literal("draft"),
      v.literal("computed"),
      v.literal("validated"),
      v.literal("paid")
    ),
    warnings: v.array(v.string()),
    workedDays: v.number(),
  })
    .index("by_payrun", ["payrunId"])
    .index("by_employee", ["employeeId"]),

  salaryRules: defineTable({
    amount: v.optional(v.number()),
    category: v.union(
      v.literal("basic"),
      v.literal("allowance"),
      v.literal("gross"),
      v.literal("deduction"),
      v.literal("net")
    ),
    code: v.string(), // e.g. "BASIC", "HRA", "PF"
    computationType: v.union(
      v.literal("fixed"),
      v.literal("percentage"),
      v.literal("formula")
    ),
    formula: v.optional(v.string()),
    name: v.string(),
    percentage: v.optional(v.number()),
    percentageOf: v.optional(v.string()),
    sequence: v.number(),
    structureId: v.id("salaryStructures"),
  }).index("by_structure_sequence", ["structureId", "sequence"]),

  salaryStructures: defineTable({ active: v.boolean(), name: v.string() }),

  scheduleDays: defineTable({
    breakMinutes: v.number(),
    dayOfWeek: v.number(), // 0=Sun .. 6=Sat
    endTime: v.string(),
    scheduleId: v.id("workingSchedules"),
    startTime: v.string(), // "09:00"
  }).index("by_schedule", ["scheduleId"]),

  // Action/audit history for every time-off operation
  timeOffActionHistory: defineTable({
    action: v.union(
      v.literal("request_created"),
      v.literal("approved"),
      v.literal("refused"),
      v.literal("cancelled"),
      v.literal("balance_adjusted")
    ),
    comment: v.optional(v.string()),
    newStatus: v.string(),
    performedBy: v.id("users"),
    previousStatus: v.optional(v.string()),
    timeOffRequestId: v.id("timeOffRequests"),
  }).index("by_request", ["timeOffRequestId"]),

  // Employee leave allocations (balance tracking)
  timeOffAllocations: defineTable({
    adjustedDays: v.number(), // manual HR adjustments (+/-)
    allocatedAmount: v.number(),
    employeeId: v.id("employees"),
    status: v.union(v.literal("active"), v.literal("expired")),
    takenAmount: v.number(),
    timeOffTypeId: v.id("timeOffTypes"),
    validFrom: v.number(),
    validTo: v.optional(v.number()),
    year: v.number(), // 2026, 2027 etc.
  })
    .index("by_employee_type", ["employeeId", "timeOffTypeId"])
    .index("by_employee_year", ["employeeId", "year"]),

  // Time off requests
  timeOffRequests: defineTable({
    allocationId: v.optional(v.id("timeOffAllocations")),
    cancelledAt: v.optional(v.number()),
    duration: v.number(),
    employeeId: v.id("employees"),
    endDate: v.number(),
    processedAt: v.optional(v.number()),
    processedBy: v.optional(v.id("users")),
    reason: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    startDate: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("refused"),
      v.literal("cancelled")
    ),
    timeOffTypeId: v.id("timeOffTypes"),
  })
    .index("by_employee", ["employeeId"])
    .index("by_status", ["status"]),

  // Time off type definitions
  timeOffTypes: defineTable({
    defaultAllocation: v.optional(v.number()), // default days for new allocations
    description: v.optional(v.string()),
    isActive: v.boolean(),
    isPaid: v.boolean(),
    name: v.string(),
    requiresApproval: v.boolean(),
    requiresBalance: v.boolean(),
    unit: v.union(v.literal("days"), v.literal("hours")),
  }),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    employeeId: v.optional(v.id("employees")),
    role: v.union(
      v.literal("employee"),
      v.literal("hr_manager"),
      v.literal("hr_payroll_user"),
      v.literal("hr_payroll_manager"),
      v.literal("admin")
    ),
  }).index("by_clerkId", ["clerkId"]),

  workingSchedules: defineTable({
    name: v.string(),
    weeklyHours: v.number(), // cached, derived from scheduleDays on write
  }),
});
