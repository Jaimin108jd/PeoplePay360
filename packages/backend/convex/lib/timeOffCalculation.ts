/**
 * Time Off Calculation Service
 * §8.2 — Business day calculation, overlap detection, leave validation
 *
 * Architecture note: This is a pure service module. Controllers/mutations
 * call these functions and handle DB operations. This keeps calculation
 * logic testable and reusable across attendance, payroll, and time-off.
 */

// ─── Leave Day Calculation ──────────────────────────────────────────────────

/**
 * Calculate calendar days between two dates (inclusive).
 * Version 1: Simple calendar days. Later versions will exclude weekends,
 * holidays, and apply half-day rules.
 */
export function calculateLeaveDays(startMs: number, endMs: number): number {
  const start = new Date(startMs);
  const end = new Date(endMs);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - start.getTime();
  const calendarDays = Math.round(diffMs / 86_400_000) + 1;
  return Math.max(1, calendarDays);
}

/**
 * Calculate business days (exclude weekends).
 * Version 1: Excludes Sat/Sun only. Later: exclude holidays, apply schedules.
 */
export function calculateBusinessDays(startMs: number, endMs: number): number {
  const start = new Date(startMs);
  const end = new Date(endMs);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return Math.max(1, count);
}

// ─── Overlap Detection ──────────────────────────────────────────────────────

export interface ExistingRequest {
  _id: string;
  endDate: number;
  startDate: number;
  status: string;
}

/**
 * Check if a new request overlaps with any existing PENDING or APPROVED request.
 * REFUSED and CANCELLED requests do NOT block overlaps.
 *
 * Overlap condition: existing.startDate <= new.endDate AND existing.endDate >= new.startDate
 */
export function hasOverlap(
  newStartMs: number,
  newEndMs: number,
  existingRequests: ExistingRequest[]
): ExistingRequest | null {
  for (const req of existingRequests) {
    if (req.status === "refused" || req.status === "cancelled") {
      continue;
    }
    if (req.startDate <= newEndMs && req.endDate >= newStartMs) {
      return req;
    }
  }
  return null;
}

// ─── Duplicate Detection ────────────────────────────────────────────────────

export function isDuplicate(
  newStartMs: number,
  newEndMs: number,
  newTypeId: string,
  existingRequests: (ExistingRequest & { timeOffTypeId: string })[]
): boolean {
  return existingRequests.some(
    (r) =>
      r.status !== "refused" &&
      r.status !== "cancelled" &&
      r.startDate === newStartMs &&
      r.endDate === newEndMs &&
      r.timeOffTypeId === newTypeId
  );
}

// ─── Date Validation ────────────────────────────────────────────────────────

export function isPastDate(dateMs: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateMs < today.getTime();
}

export function isInvalidDateRange(startMs: number, endMs: number): boolean {
  return startMs > endMs;
}
