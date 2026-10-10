import { db } from "./db";
import { lagosDate } from "./lagos-time";
import { cycleWhereForDay, periodEndFor, periodStartFor } from "./reviews";

// The check-in a staff member owes today, if any. Questions are selected
// without expectedOutcome, which staff must never see (PRD §6.9).
export async function reviewStatus(staffId: string) {
  const today = lagosDate();
  const cycle = await db.reviewCycle.findFirst({
    where: cycleWhereForDay(today),
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      cadence: true,
      startDate: true,
      questions: { orderBy: { order: "asc" }, select: { id: true, questionText: true, isLongAnswer: true } },
    },
  });
  if (!cycle || cycle.questions.length === 0) return null;
  const periodStart = periodStartFor(cycle.startDate, cycle.cadence, today)!;
  const submission = await db.reviewSubmission.findUnique({
    where: { staffId_cycleId_periodStart: { staffId, cycleId: cycle.id, periodStart } },
    select: { id: true },
  });
  return { cycle, periodStart, periodEnd: periodEndFor(periodStart, cycle.cadence), due: !submission };
}
