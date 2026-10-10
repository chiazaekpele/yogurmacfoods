import type { ReviewCadence } from "@/generated/prisma/client";
import { addDays, addMonths } from "./lagos-time";

export const CADENCE_LABELS: Record<ReviewCadence, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Every two weeks",
  MONTHLY: "Monthly",
};

function step(day: Date, cadence: ReviewCadence, n: number): Date {
  switch (cadence) {
    case "DAILY":
      return addDays(day, n);
    case "WEEKLY":
      return addDays(day, 7 * n);
    case "BIWEEKLY":
      return addDays(day, 14 * n);
    case "MONTHLY":
      return addMonths(day, n);
  }
}

// Periods repeat from the cycle's start date. All values are Lagos calendar
// days stored as UTC midnight (see lagos-time.ts).
export function periodStartFor(cycleStart: Date, cadence: ReviewCadence, day: Date): Date | null {
  if (day < cycleStart) return null;
  if (cadence === "MONTHLY") {
    let n = (day.getUTCFullYear() - cycleStart.getUTCFullYear()) * 12 + day.getUTCMonth() - cycleStart.getUTCMonth();
    while (n > 0 && step(cycleStart, cadence, n) > day) n--;
    return step(cycleStart, cadence, n);
  }
  const len = cadence === "DAILY" ? 1 : cadence === "WEEKLY" ? 7 : 14;
  const days = Math.floor((day.getTime() - cycleStart.getTime()) / 86_400_000);
  return addDays(cycleStart, Math.floor(days / len) * len);
}

export function periodEndFor(periodStart: Date, cadence: ReviewCadence): Date {
  return addDays(step(periodStart, cadence, 1), -1);
}

// Completed periods in [from, before), oldest first; used to record missed check-ins.
export function periodsBetween(cycleStart: Date, cadence: ReviewCadence, from: Date, before: Date): Date[] {
  const out: Date[] = [];
  let p = periodStartFor(cycleStart, cadence, from < cycleStart ? cycleStart : from);
  // A period that began before `from` is only counted if `from` is its first day.
  if (p && p < from) p = step(p, cadence, 1);
  while (p && step(p, cadence, 1) <= before) {
    out.push(p);
    p = step(p, cadence, 1);
  }
  return out;
}

// The question set in force on a Lagos day: the latest cycle that has started
// and not been replaced. Replacing a cycle sets its endDate to the next
// period start, so in-progress periods keep their questions (PRD §6.9).
export const cycleWhereForDay = (day: Date) => ({
  startDate: { lte: day },
  OR: [{ endDate: null }, { endDate: { gt: day } }],
});
