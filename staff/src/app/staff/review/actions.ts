"use server";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { backWith, plainText, str } from "@/lib/forms";
import { reviewStatus } from "@/lib/review-status";
import { requireRole } from "@/lib/session";

const PATH = "/staff/review";

// All answers at once; final once submitted (PRD §7.5).
export async function submitReview(form: FormData) {
  const staff = await requireRole("STAFF");
  const status = await reviewStatus(staff.id);
  if (!status?.due) backWith(PATH, "error", "There’s no check-in due right now.");
  // The questions may have changed since the page loaded.
  if (str(form, "cycleId") !== status.cycle.id || str(form, "periodStart") !== status.periodStart.toISOString().slice(0, 10)) {
    backWith(PATH, "error", "The check-in questions have just changed. Please answer the updated questions.");
  }

  const answers: { questionId: string; responseText: string }[] = [];
  for (const q of status.cycle.questions) {
    const parsed = plainText(q.isLongAnswer ? 5000 : 500).safeParse(str(form, `q_${q.id}`));
    if (!parsed.success || !parsed.data) backWith(PATH, "error", `Please answer: “${q.questionText}”`);
    answers.push({ questionId: q.id, responseText: parsed.data });
  }

  try {
    await db.reviewSubmission.create({
      data: {
        cycleId: status.cycle.id,
        staffId: staff.id,
        periodStart: status.periodStart,
        submittedAt: new Date(),
        responses: { create: answers },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") backWith(PATH, "error", "You’ve already submitted this check-in.");
    throw err;
  }
  backWith(PATH, "ok", "Thank you, your check-in is submitted.");
}
