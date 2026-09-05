import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { computeWeeklyHours } from "./lib/payroll_engine";
import { requireMinRole, requireUser } from "./lib/rbac";

export const scheduleDayValidator = v.object({
  breakMinutes: v.number(),
  dayOfWeek: v.number(), // 0=Sun .. 6=Sat
  endTime: v.string(), // "18:00"
  startTime: v.string(), // "09:00"
});

export const list = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // await requireUser(ctx, args.clerkId);
    const schedules = await ctx.db.query("workingSchedules").collect();

    const enhanced = await Promise.all(
      schedules.map(async (s) => {
        const days = await ctx.db
          .query("scheduleDays")
          .withIndex("by_schedule", (q) => q.eq("scheduleId", s._id))
          .collect();
        return {
          ...s,
          days: days.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
        };
      })
    );

    return enhanced;
  },
});

export const get = query({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("workingSchedules"),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.clerkId);
    const schedule = await ctx.db.get(args.id);
    if (!schedule) {
      return null;
    }

    const days = await ctx.db
      .query("scheduleDays")
      .withIndex("by_schedule", (q) => q.eq("scheduleId", schedule._id))
      .collect();

    return {
      ...schedule,
      days: days.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    };
  },
});

export const create = mutation({
  args: {
    clerkId: v.optional(v.string()),
    days: v.array(scheduleDayValidator),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    // Compute weekly hours using §8.2 algorithm
    const computedWeeklyHours = computeWeeklyHours(args.days as any);

    const scheduleId = await ctx.db.insert("workingSchedules", {
      name: args.name.trim(),
      weeklyHours: computedWeeklyHours,
    });

    for (const day of args.days) {
      await ctx.db.insert("scheduleDays", {
        breakMinutes: day.breakMinutes,
        dayOfWeek: day.dayOfWeek,
        endTime: day.endTime,
        scheduleId,
        startTime: day.startTime,
      });
    }

    return scheduleId;
  },
});

export const update = mutation({
  args: {
    clerkId: v.optional(v.string()),
    days: v.optional(v.array(scheduleDayValidator)),
    id: v.id("workingSchedules"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    const schedule = await ctx.db.get(args.id);
    if (!schedule) {
      throw new Error("Working Schedule not found");
    }

    if (args.name) {
      await ctx.db.patch(args.id, { name: args.name.trim() });
    }

    if (args.days) {
      // Remove old days
      const existingDays = await ctx.db
        .query("scheduleDays")
        .withIndex("by_schedule", (q) => q.eq("scheduleId", args.id))
        .collect();

      for (const d of existingDays) {
        await ctx.db.delete(d._id);
      }

      // Re-insert days
      for (const day of args.days) {
        await ctx.db.insert("scheduleDays", {
          breakMinutes: day.breakMinutes,
          dayOfWeek: day.dayOfWeek,
          endTime: day.endTime,
          scheduleId: args.id,
          startTime: day.startTime,
        });
      }

      // Recompute weekly hours (§8.2)
      const computedWeeklyHours = computeWeeklyHours(args.days as any);
      await ctx.db.patch(args.id, { weeklyHours: computedWeeklyHours });
    }
  },
});

export const remove = mutation({
  args: {
    clerkId: v.optional(v.string()),
    id: v.id("workingSchedules"),
  },
  handler: async (ctx, args) => {
    await requireMinRole(ctx, "hr_manager", args.clerkId);

    // Check if any employees are linked
    const linkedEmployees = await ctx.db
      .query("employees")
      .filter((q) => q.eq(q.field("scheduleId"), args.id))
      .first();

    if (linkedEmployees) {
      throw new Error("Cannot delete schedule that is assigned to employees.");
    }

    const days = await ctx.db
      .query("scheduleDays")
      .withIndex("by_schedule", (q) => q.eq("scheduleId", args.id))
      .collect();

    for (const d of days) {
      await ctx.db.delete(d._id);
    }

    await ctx.db.delete(args.id);
  },
});
