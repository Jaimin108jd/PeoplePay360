import type { Doc } from "../_generated/dataModel";

type ScheduleDayInput = {
  breakMinutes: number;
  dayOfWeek: number;
  endTime: string; // "18:00"
  startTime: string; // "09:00"
};

/**
 * Parse a time string "HH:MM" into total minutes since midnight.
 */
function diffMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/**
 * §8.2 Working-hours calculation
 * Compute total weekly hours from a list of schedule days.
 * Each day's contribution = (endTime - startTime) - breakMinutes, in hours.
 */
export function computeWeeklyHours(days: ScheduleDayInput[]): number {
  return days.reduce((total, d) => {
    const minutes = diffMinutes(d.startTime, d.endTime) - d.breakMinutes;
    return total + Math.max(0, minutes / 60);
  }, 0);
}

/**
 * §8.1 Period-based contract selection
 * Pure function to select the applicable contract for an employee over a given period.
 */
export function selectApplicableContract(
  contracts: Doc<"contracts">[],
  periodStart: number,
  periodEnd: number
): Doc<"contracts"> | null {
  const candidates = contracts.filter(
    (c) =>
      c.status === "active" &&
      c.startDate <= periodEnd &&
      (c.endDate === undefined || c.endDate >= periodStart)
  );

  if (candidates.length === 0) {
    return null;
  }

  // If multiple overlap, the most recently started wins
  return candidates.sort((a, b) => b.startDate - a.startDate)[0];
}

/**
 * §8.1 Active contract date overlap check.
 * Returns true if the proposed date range overlaps with any existing active contract for the employee.
 * Range overlap rule: newStart <= existingEnd && newEnd >= existingStart
 * Open-ended contracts treat endDate as Infinity.
 */
export function hasContractOverlap(
  existingContracts: Array<{
    _id?: string;
    endDate?: number;
    startDate: number;
    status: string;
  }>,
  candidate: {
    _id?: string;
    endDate?: number;
    startDate: number;
  }
): boolean {
  const newStart = candidate.startDate;
  const newEnd = candidate.endDate ?? Number.POSITIVE_INFINITY;

  return existingContracts.some((c) => {
    if (candidate._id && c._id === candidate._id) {
      return false;
    }
    if (c.status !== "active") {
      return false;
    }
    const existStart = c.startDate;
    const existEnd = c.endDate ?? Number.POSITIVE_INFINITY;
    return newStart <= existEnd && newEnd >= existStart;
  });
}
