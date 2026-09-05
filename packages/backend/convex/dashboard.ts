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

    const [
      employees,
      departments,
      payruns,
      timeOffRequests,
      contracts,
      attendanceRecords,
      salaryStructures,
      allUsers,
      allPayslips,
    ] = await Promise.all([
      ctx.db.query("employees").collect(),
      ctx.db.query("departments").collect(),
      ctx.db.query("payruns").collect(),
      ctx.db.query("timeOffRequests").collect(),
      ctx.db.query("contracts").collect(),
      ctx.db.query("attendance").collect(),
      ctx.db.query("salaryStructures").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("payslips").collect(),
    ]);

    const currentEmployee = user.employeeId
      ? await ctx.db.get(user.employeeId)
      : null;

    let employeePayslips: any[] = [];
    let employeeAttendance: any[] = [];
    let employeeTimeOff: any[] = [];
    let employeeLeaveBalances: any[] = [];
    let currentContract: any = null;

    if (user.employeeId) {
      const [rawPayslips, rawAttendance, rawTimeOff, rawBalances, timeOffTypes] =
        await Promise.all([
          ctx.db
            .query("payslips")
            .withIndex("by_employee", (q) => q.eq("employeeId", user.employeeId!))
            .collect(),
          ctx.db
            .query("attendance")
            .withIndex("by_employee_date", (q) =>
              q.eq("employeeId", user.employeeId!)
            )
            .collect(),
          ctx.db
            .query("timeOffRequests")
            .withIndex("by_employee", (q) => q.eq("employeeId", user.employeeId!))
            .collect(),
          ctx.db
            .query("timeOffAllocations")
            .withIndex("by_employee_type", (q) =>
              q.eq("employeeId", user.employeeId!)
            )
            .collect(),
          ctx.db.query("timeOffTypes").collect(),
        ]);

      employeePayslips = rawPayslips;
      employeeAttendance = rawAttendance;
      employeeTimeOff = rawTimeOff;
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

    const employeeMap = new Map(employees.map((e) => [e._id, e.name]));
    const pendingLeaveQueue = pendingLeaveApprovals.slice(0, 5).map((r) => ({
      ...r,
      employeeName: employeeMap.get(r.employeeId) ?? "Employee",
    }));

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
      pendingLeaveRequests: pendingLeaveQueue,
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
