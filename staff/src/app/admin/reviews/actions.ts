"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requiredText, str } from "@/lib/forms";
import { addDays, lagosDate } from "@/lib/lagos-time";
import { periodEndFor, periodStartFor } from "@/lib/reviews";
import { requireRole } from "@/lib/session";

export type ReviewSetupState = { error?: string; ok?: string } | null;

const schema = z.object({
  cadence: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  questions: z
    .array(
      z.object({
        questionText: requiredText(500, "Each question"),
        expectedOutcome: requiredText(1000, "Each expected outcome"),
        isLongAnswer: z.boolean(),
      }),
    )
    .max(30, "Keep it to 30 questions or fewer."),
});

export async function saveReviewSetup(_prev: ReviewSetupState, form: FormData): Promise<ReviewSetupState> {
  const admin = await requireRole("ADMIN");
  let payload: unknown;
  try {
    payload = JSON.parse(str(form, "payload"));
  } catch {
    return { error: "The form could not be read. Please try again." };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the questions." };
  const { cadence, questions } = parsed.data;
  const today = lagosDate();

  const message = await db.$transaction(async (tx) => {
    // Not yet started (an earlier edit scheduled it): safe to rewrite in place.
    const upcoming = await tx.reviewCycle.findFirst({ where: { startDate: { gt: today }, endDate: null } });
    const current = await tx.reviewCycle.findFirst({
      where: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gt: today } }] },
      orderBy: { startDate: "desc" },
      include: { _count: { select: { submissions: true } } },
    });

    const writeQuestions = (cycleId: string) =>
      tx.reviewQuestion.createMany({ data: questions.map((q, i) => ({ ...q, cycleId, order: i })) });

    if (!questions.length) {
      // Turn check-ins off from today.
      await tx.reviewCycle.updateMany({ where: { OR: [{ endDate: null }, { endDate: { gt: today } }] }, data: { endDate: today, isActive: false } });
      await audit(tx, { actorId: admin.id, action: "REVIEWS_DISABLED", entityType: "ReviewCycle", entityId: current?.id ?? "-" });
      return "Check-ins are turned off. Add questions to turn them back on.";
    }

    if (upcoming) {
      await tx.reviewQuestion.deleteMany({ where: { cycleId: upcoming.id } });
      await tx.reviewCycle.update({ where: { id: upcoming.id }, data: { cadence } });
      await writeQuestions(upcoming.id);
      await audit(tx, { actorId: admin.id, action: "REVIEW_QUESTIONS_UPDATED", entityType: "ReviewCycle", entityId: upcoming.id, newValue: { cadence, questions } });
      return "Saved. The new questions start with the next check-in period.";
    }

    if (current && current._count.submissions === 0) {
      await tx.reviewQuestion.deleteMany({ where: { cycleId: current.id } });
      await tx.reviewCycle.update({ where: { id: current.id }, data: { cadence, startDate: current.cadence === cadence ? current.startDate : today } });
      await writeQuestions(current.id);
      await audit(tx, { actorId: admin.id, action: "REVIEW_QUESTIONS_UPDATED", entityType: "ReviewCycle", entityId: current.id, newValue: { cadence, questions } });
      return "Saved. Staff will see these questions now.";
    }

    // Someone has already answered (or missed) this cycle: start the new set
    // when the current period ends.
    let start = today;
    if (current) {
      const p = periodStartFor(current.startDate, current.cadence, today)!;
      start = addDays(periodEndFor(p, current.cadence), 1);
      await tx.reviewCycle.update({ where: { id: current.id }, data: { endDate: start, isActive: false } });
    }
    const cycle = await tx.reviewCycle.create({ data: { cadence, startDate: start, isActive: true } });
    await writeQuestions(cycle.id);
    await audit(tx, { actorId: admin.id, action: "REVIEW_CYCLE_CREATED", entityType: "ReviewCycle", entityId: cycle.id, newValue: { cadence, startDate: start.toISOString().slice(0, 10), questions } });
    return current ? "Saved. The new questions start with the next check-in period." : "Saved. Staff will see their first check-in now.";
  });

  revalidatePath("/admin/reviews");
  return { ok: message };
}
