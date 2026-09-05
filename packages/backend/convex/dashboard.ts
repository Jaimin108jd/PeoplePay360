import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/rbac";

export const getMetrics = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.clerkId);
    if (!user) {
      return null;
    }

    const employees = await ctx.db.query("employees").collect();
    const departments = await ctx.db.query("departments").collect();
    const payruns = await ctx.db.query("payruns").collect();
    const timeOffRequests = await ctx.db.query("timeOffRequests").collect();
    const contracts = await ctx.db.query("contracts").collect();
    const attendanceRecords = await ctx.db.query("attendance").collect();
    const salaryStructures = await ctx.db.query("salaryStructures").collect();
    const allUsers = await ctx.db.query("users").collect();

    const currentEmployee = user.employeeId
      ? await ctx.db.get(user.employeeId)
      : null;

    let employeePayslips: any[] = [];
    let employeeAttendance: any[] = [];
    let employeeTimeOff: any[] = [];
    let employeeLeaveBalances: any[] = [];
    let currentContract: any = null;

    if (user.employeeId) {
      employeePayslips = await ctx.db
        .query("payslips")
        .withIndex("by_employee", (q) => q.eq("employeeId", user.employeeId!))
        .collect();

      employeeAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_employee_date", (q) =>
          q.eq("employeeId", user.employeeId!)
        )
        .collect();

      employeeTimeOff = await ctx.db
        .query("timeOffRequests")
        .withIndex("by_employee", (q) => q.eq("employeeId", user.employeeId!))
        .collect();

      const rawBalances = await ctx.db
        .query("timeOffAllocations")
        .withIndex("by_employee_type", (q) =>
          q.eq("employeeId", user.employeeId!)
        )
        .collect();
      const timeOffTypes = await ctx.db.query("timeOffTypes").collect();
      const typeMap = new Map(timeOffTypes.map((t) => [t._id, t.name]));
      employeeLeaveBalances = rawBalances.map((b) => ({
        ...b,
        typeName: typeMap.get(b.timeOffTypeId) ?? "Leave",
      }));

      currentContract = contracts.find(
        (c) => c.employeeId === user.employeeId && c.status === "active"
      );
    }

    const activeEmployeesCount = employees.filter(
      (e) => e.status === "active"
    ).length;
    const pendingLeaveApprovals = timeOffRequests.filter(
      (r) => r.status === "pending"
    );
    const attendanceExceptions = attendanceRecords.filter(
      (a) => a.status === "exception" || a.status === "late"
    );

    const draftPayruns = payruns.filter((p) => p.status === "draft");
    const computedPayruns = payruns.filter((p) => p.status === "computed");
    const validatedPayruns = payruns.filter((p) => p.status === "validated");
    const paidPayruns = payruns.filter((p) => p.status === "paid");

    const allPayslips = await ctx.db.query("payslips").collect();
    const totalGrossLiability = allPayslips.reduce(
      (acc, p) => acc + (p.gross || 0),
      0
    );
    const totalNetLiability = allPayslips.reduce(
      (acc, p) => acc + (p.net || 0),
      0
    );
    const payslipWarningsCount = allPayslips.filter(
      (p) => p.warnings && p.warnings.length > 0
    ).length;

    return {
      counts: {
        activeEmployees: activeEmployeesCount,
        attendanceExceptions: attendanceExceptions.length,
        computedPayruns: computedPayruns.length,
        departments: departments.length,
        draftPayruns: draftPayruns.length,
        paidPayruns: paidPayruns.length,
        payslipWarningsCount,
        pendingLeaves: pendingLeaveApprovals.length,
        salaryStructuresCount: salaryStructures.length,
        totalEmployees: employees.length,
        totalGrossLiability,
        totalNetLiability,
        usersCount: allUsers.length,
        validatedPayruns: validatedPayruns.length,
      },
      currentContract,
      currentEmployee,
      employeeAttendance,
      employeeLeaveBalances,
      employeePayslips,
      employeeTimeOff,
      pendingLeaveRequests: pendingLeaveApprovals.slice(0, 5),
      recentPayruns: payruns.slice(-5).reverse(),
      user: {
        _id: user._id,
        email: user.email,
        employeeId: user.employeeId,
        // name: user?.name,
        role: user.role,
      },
    };
  },
});
