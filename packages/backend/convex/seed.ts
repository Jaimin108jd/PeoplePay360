import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { requireMinRole } from "./lib/rbac";

/**
 * Seed comprehensive demo data:
 * - Departments, Working Schedules, Salary Structures & Rules
 * - Time Off Types, Allocations, Requests, Attendance
 * - User accounts (with password hashes) linked to employees
 */
export async function populateDatabase(ctx: any) {
  // 1 — Departments
  const deptEngineering = await ctx.db.insert("departments", {
    name: "Engineering",
  });
  const deptProduct = await ctx.db.insert("departments", {
    name: "Product & Design",
  });
  const deptHR = await ctx.db.insert("departments", {
    name: "Human Resources",
  });
  const deptSales = await ctx.db.insert("departments", {
    name: "Sales & Marketing",
  });
  const deptFinance = await ctx.db.insert("departments", {
    name: "Finance & Operations",
  });

  // 2 — Working Schedules
  const schedStandard = await ctx.db.insert("workingSchedules", {
    name: "Standard (Mon-Fri, 40h)",
    weeklyHours: 40,
  });
  for (const day of [1, 2, 3, 4, 5]) {
    await ctx.db.insert("scheduleDays", {
      breakMinutes: 60,
      dayOfWeek: day,
      endTime: "18:00",
      scheduleId: schedStandard,
      startTime: "09:00",
    });
  }

  const schedPartTime = await ctx.db.insert("workingSchedules", {
    name: "Part-Time (Mon-Fri, 20h)",
    weeklyHours: 20,
  });
  for (const day of [1, 2, 3, 4, 5]) {
    await ctx.db.insert("scheduleDays", {
      breakMinutes: 0,
      dayOfWeek: day,
      endTime: "13:00",
      scheduleId: schedPartTime,
      startTime: "09:00",
    });
  }

  // 3 — Salary Structures & Rules
  const structStandard = await ctx.db.insert("salaryStructures", {
    active: true,
    name: "Standard India (CTC Model)",
  });

  const standardRules = [
    {
      amount: 0,
      category: "basic" as const,
      code: "BASIC",
      computationType: "fixed" as const,
      name: "Basic Salary",
      sequence: 1,
    },
    {
      category: "allowance" as const,
      code: "HRA",
      computationType: "percentage" as const,
      name: "House Rent Allowance",
      percentage: 50,
      percentageOf: "BASIC",
      sequence: 2,
    },
    {
      amount: 3000,
      category: "allowance" as const,
      code: "SPECIAL",
      computationType: "fixed" as const,
      name: "Special Allowance",
      sequence: 3,
    },
    {
      amount: 1600,
      category: "allowance" as const,
      code: "TRANSPORT",
      computationType: "fixed" as const,
      name: "Transport Allowance",
      sequence: 4,
    },
    {
      category: "gross" as const,
      code: "GROSS",
      computationType: "formula" as const,
      formula: "BASIC + HRA + SPECIAL + TRANSPORT",
      name: "Gross Earnings",
      sequence: 5,
    },
    {
      category: "deduction" as const,
      code: "PF",
      computationType: "percentage" as const,
      name: "Provident Fund (Employee)",
      percentage: 12,
      percentageOf: "BASIC",
      sequence: 6,
    },
    {
      amount: 200,
      category: "deduction" as const,
      code: "PT",
      computationType: "fixed" as const,
      name: "Professional Tax",
      sequence: 7,
    },
    {
      category: "net" as const,
      code: "NET",
      computationType: "formula" as const,
      formula: "GROSS - PF - PT",
      name: "Net Payable",
      sequence: 8,
    },
  ];

  for (const r of standardRules) {
    await ctx.db.insert("salaryRules", { structureId: structStandard, ...r });
  }

  // 4 — Time Off Types
  const typeAnnual = await ctx.db.insert("timeOffTypes", {
    defaultAllocation: 18,
    description: "Paid annual leave for vacation and personal time",
    isActive: true,
    isPaid: true,
    name: "Paid Annual Leave",
    requiresApproval: true,
    requiresBalance: true,
    unit: "days",
  });

  const typeSick = await ctx.db.insert("timeOffTypes", {
    defaultAllocation: 12,
    description: "Paid sick leave for medical reasons",
    isActive: true,
    isPaid: true,
    name: "Sick Leave",
    requiresApproval: true,
    requiresBalance: true,
    unit: "days",
  });

  const typeUnpaid = await ctx.db.insert("timeOffTypes", {
    description: "Unpaid leave / Loss of Pay (LOP). Deducted from salary.",
    isActive: true,
    isPaid: false,
    name: "Unpaid Leave (LOP)",
    requiresApproval: true,
    requiresBalance: false,
    unit: "days",
  });

  const typeCasual = await ctx.db.insert("timeOffTypes", {
    defaultAllocation: 7,
    description: "Casual leave for short-term personal needs",
    isActive: true,
    isPaid: true,
    name: "Casual Leave",
    requiresApproval: true,
    requiresBalance: true,
    unit: "days",
  });

  // 5 — Employees
  const empVP = await ctx.db.insert("employees", {
    address: "42 Residency Road, Indiranagar, Bengaluru",
    bankDetails: {
      accountName: "Vikram Malhotra",
      accountNumber: "918273645019",
      ifsc: "HDFC0001824",
    },
    dateOfBirth: "1988-04-12",
    departmentId: deptEngineering,
    email: "vikram.malhotra@peoplepay360.com",
    emergencyContact: "Sunita Malhotra (+91 98877 66554)",
    employeeType: "full_time",
    jobPosition: "VP of Engineering",
    name: "Vikram Malhotra",
    phone: "+91 98765 43210",
    scheduleId: schedStandard,
    status: "active",
  });

  const empArjun = await ctx.db.insert("employees", {
    address: "Flat 402, Green Glen Layout, Bellandur, Bengaluru",
    bankDetails: {
      accountName: "Arjun Sharma",
      accountNumber: "501004928172",
      ifsc: "HDFC0000240",
    },
    dateOfBirth: "1994-08-23",
    departmentId: deptEngineering,
    email: "arjun.sharma@peoplepay360.com",
    emergencyContact: "Neha Sharma (+91 98451 23456)",
    employeeType: "full_time",
    jobPosition: "Senior Full Stack Engineer",
    managerId: empVP,
    name: "Arjun Sharma",
    phone: "+91 98450 11223",
    scheduleId: schedStandard,
    status: "active",
  });

  const empPriya = await ctx.db.insert("employees", {
    address: "15th Cross, Koramangala 4th Block, Bengaluru",
    bankDetails: {
      accountName: "Priya Nair",
      accountNumber: "00021020003491",
      ifsc: "ICIC0000002",
    },
    dateOfBirth: "1992-11-15",
    departmentId: deptProduct,
    email: "priya.nair@peoplepay360.com",
    emergencyContact: "Karthik Nair (+91 97412 88990)",
    employeeType: "full_time",
    jobPosition: "Principal Product Manager",
    managerId: empVP,
    name: "Priya Nair",
    phone: "+91 97400 99887",
    scheduleId: schedStandard,
    status: "active",
  });

  const empAnanya = await ctx.db.insert("employees", {
    address: "7th Main, HSR Layout Sector 1, Bengaluru",
    bankDetails: {
      accountName: "Ananya Deshmukh",
      accountNumber: "320194820194",
      ifsc: "SBIN0004051",
    },
    dateOfBirth: "1995-02-19",
    departmentId: deptHR,
    email: "ananya.hr@peoplepay360.com",
    emergencyContact: "Ramesh Deshmukh (+91 99001 22334)",
    employeeType: "full_time",
    jobPosition: "Head of People Operations",
    name: "Ananya Deshmukh",
    phone: "+91 99001 55667",
    scheduleId: schedStandard,
    status: "active",
  });

  const empRohan = await ctx.db.insert("employees", {
    address: "302, Whitefield Main Road, Bengaluru",
    bankDetails: {
      accountName: "Rohan Mehta",
      accountNumber: "620194829104",
      ifsc: "UTIB0000128",
    },
    dateOfBirth: "2000-06-08",
    departmentId: deptEngineering,
    email: "rohan.mehta@peoplepay360.com",
    emergencyContact: "Dinesh Mehta (+91 91234 56780)",
    employeeType: "full_time",
    jobPosition: "Frontend Engineer I",
    managerId: empArjun,
    name: "Rohan Mehta",
    phone: "+91 91234 56789",
    scheduleId: schedStandard,
    status: "active",
  });

  const empKavita = await ctx.db.insert("employees", {
    address: "88, JP Nagar 3rd Phase, Bengaluru",
    bankDetails: {
      accountName: "Kavita Rao",
      accountNumber: "110294820192",
      ifsc: "KKBK0008012",
    },
    dateOfBirth: "1997-09-30",
    departmentId: deptProduct,
    email: "kavita.rao@peoplepay360.com",
    emergencyContact: "Anand Rao (+91 93456 78901)",
    employeeType: "contract",
    jobPosition: "Visual UI Designer",
    name: "Kavita Rao",
    phone: "+91 93456 78900",
    scheduleId: schedPartTime,
    status: "active",
  });

  // 6 — User accounts
  const seededUsers = [
    {
      clerkId: "seed_vikram",
      email: "vikram.malhotra@peoplepay360.com",
      employeeId: empVP,
      role: "hr_manager" as const,
    },
    {
      clerkId: "seed_arjun",
      email: "arjun.sharma@peoplepay360.com",
      employeeId: empArjun,
      role: "employee" as const,
    },
    {
      clerkId: "seed_priya",
      email: "priya.nair@peoplepay360.com",
      employeeId: empPriya,
      role: "hr_payroll_user" as const,
    },
    {
      clerkId: "seed_ananya",
      email: "ananya.hr@peoplepay360.com",
      employeeId: empAnanya,
      role: "hr_manager" as const,
    },
    {
      clerkId: "seed_rohan",
      email: "rohan.mehta@peoplepay360.com",
      employeeId: empRohan,
      role: "employee" as const,
    },
    {
      clerkId: "seed_kavita",
      email: "kavita.rao@peoplepay360.com",
      employeeId: empKavita,
      role: "employee" as const,
    },
  ];

  for (const u of seededUsers) {
    await ctx.db.insert("users", {
      clerkId: u.clerkId,
      email: u.email,
      employeeId: u.employeeId,
      role: u.role,
    });
  }

  // 7 — Contracts
  const contractStartDate = new Date("2026-01-01").getTime();

  const employeeContracts = [
    {
      dept: deptEngineering,
      empId: empVP,
      position: "VP of Engineering",
      wage: 180_000,
    },
    {
      dept: deptEngineering,
      empId: empArjun,
      position: "Senior Full Stack Engineer",
      wage: 110_000,
    },
    {
      dept: deptProduct,
      empId: empPriya,
      position: "Principal Product Manager",
      wage: 125_000,
    },
    {
      dept: deptHR,
      empId: empAnanya,
      position: "Head of People Operations",
      wage: 95_000,
    },
    {
      dept: deptEngineering,
      empId: empRohan,
      position: "Frontend Engineer I",
      wage: 55_000,
    },
    {
      dept: deptProduct,
      empId: empKavita,
      position: "Visual UI Designer",
      wage: 45_000,
    },
  ];

  for (const c of employeeContracts) {
    await ctx.db.insert("contracts", {
      departmentId: c.dept,
      employeeId: c.empId,
      position: c.position,
      salaryStructureId: structStandard,
      startDate: contractStartDate,
      status: "active",
      wage: c.wage,
    });
  }

  // 8 — Time Off Allocations
  const allEmps = [empVP, empArjun, empPriya, empAnanya, empRohan, empKavita];
  for (const empId of allEmps) {
    await ctx.db.insert("timeOffAllocations", {
      adjustedDays: 0,
      allocatedAmount: 18,
      employeeId: empId,
      status: "active",
      takenAmount: 2,
      timeOffTypeId: typeAnnual,
      validFrom: contractStartDate,
      year: 2026,
    });

    await ctx.db.insert("timeOffAllocations", {
      adjustedDays: 0,
      allocatedAmount: 12,
      employeeId: empId,
      status: "active",
      takenAmount: 1,
      timeOffTypeId: typeSick,
      validFrom: contractStartDate,
      year: 2026,
    });

    await ctx.db.insert("timeOffAllocations", {
      adjustedDays: 0,
      allocatedAmount: 7,
      employeeId: empId,
      status: "active",
      takenAmount: 0,
      timeOffTypeId: typeCasual,
      validFrom: contractStartDate,
      year: 2026,
    });
  }

  // 9 — Time Off Requests
  const reqArjun = await ctx.db.insert("timeOffRequests", {
    duration: 2,
    employeeId: empArjun,
    endDate: new Date("2026-08-15").getTime(),
    processedAt: new Date("2026-08-10").getTime(),
    processedBy: empVP,
    reason: "Family function out of town",
    startDate: new Date("2026-08-14").getTime(),
    status: "approved",
    timeOffTypeId: typeAnnual,
  });

  await ctx.db.insert("timeOffRequests", {
    duration: 3,
    employeeId: empPriya,
    endDate: new Date("2026-09-12").getTime(),
    reason: "Personal vacation",
    startDate: new Date("2026-09-10").getTime(),
    status: "pending",
    timeOffTypeId: typeAnnual,
  });

  await ctx.db.insert("timeOffRequests", {
    duration: 1,
    employeeId: empRohan,
    endDate: new Date("2026-09-02").getTime(),
    processedAt: new Date("2026-09-01").getTime(),
    processedBy: empVP,
    reason: "Fever, feeling unwell",
    startDate: new Date("2026-09-02").getTime(),
    status: "approved",
    timeOffTypeId: typeSick,
  });

  // Action history
  await ctx.db.insert("timeOffActionHistory", {
    action: "request_created",
    newStatus: "pending",
    performedBy: empArjun,
    timeOffRequestId: reqArjun,
  });
  await ctx.db.insert("timeOffActionHistory", {
    action: "approved",
    comment: "Approved. Enjoy your time off!",
    newStatus: "approved",
    performedBy: empVP,
    previousStatus: "pending",
    timeOffRequestId: reqArjun,
  });

  // 10 — Attendance Records
  const sampleDates = [
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
    "2026-09-05",
  ];
  for (const date of sampleDates) {
    for (const empId of [empVP, empArjun, empPriya, empAnanya, empRohan]) {
      await ctx.db.insert("attendance", {
        checkIn: new Date(`${date}T09:05:00`).getTime(),
        checkOut: new Date(`${date}T18:10:00`).getTime(),
        date,
        employeeId: empId,
        status: "present",
        workedMinutes: 485,
      });
    }
  }

  return { employeeCount: allEmps.length, seeded: true };
}

export const run = internalMutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("departments").first();
    if (existing) {
      return { skipped: true };
    }
    return await populateDatabase(ctx);
  },
});

export const seedDemoData = mutation({
  args: {
    clerkId: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    const existing = await ctx.db.query("departments").first();
    if (existing && !args.force) {
      return { message: "Database already contains departments and data." };
    }

    if (args.force) {
      const tables = [
        "attendance",
        "leaveBalanceAdjustments",
        "payslipLines",
        "payslips",
        "payruns",
        "timeOffActionHistory",
        "timeOffRequests",
        "timeOffAllocations",
        "timeOffTypes",
        "contracts",
        "employees",
        "salaryRules",
        "salaryStructures",
        "scheduleDays",
        "workingSchedules",
        "departments",
        "users",
      ] as const;

      for (const table of tables) {
        const rows = await ctx.db.query(table).collect();
        for (const row of rows) {
          await ctx.db.delete(row._id);
        }
      }
    }

    return await populateDatabase(ctx);
  },
});
