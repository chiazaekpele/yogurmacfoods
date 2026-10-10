import type { Metadata } from "next";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime, formatDay, isoDay } from "@/lib/lagos-time";
import { reviewStatus } from "@/lib/review-status";
import { CADENCE_LABELS } from "@/lib/reviews";
import { requireRole } from "@/lib/session";
import { submitReview } from "./actions";

export const metadata: Metadata = { title: "Check-in" };

export default async function StaffReviewPage({ searchParams }: PageProps<"/staff/review">) {
  const staff = await requireRole("STAFF");
  const [status, past] = await Promise.all([
    reviewStatus(staff.id),
    // Own submissions only; no expected outcomes or admin notes.
    db.reviewSubmission.findMany({
      where: { staffId: staff.id },
      orderBy: { periodStart: "desc" },
      take: 20,
      select: {
        id: true,
        periodStart: true,
        submittedAt: true,
        isMissed: true,
        responses: { select: { id: true, responseText: true, question: { select: { questionText: true, order: true } } } },
      },
    }),
  ]);

  return (
    <div className="stack">
      <PageHead title="Check-in" lede={status ? `${CADENCE_LABELS[status.cycle.cadence]} check-in.` : undefined} />
      <Flash searchParams={searchParams} />

      {!status && <div className="card muted">There are no check-in questions at the moment.</div>}
      {status && !status.due && (
        <div className="card">
          You’re all done for this period ({formatDay(status.periodStart)} – {formatDay(status.periodEnd)}). Thank you.
        </div>
      )}
      {status?.due && (
        <form action={submitReview} className="card" style={{ maxWidth: 720 }}>
          <input type="hidden" name="cycleId" value={status.cycle.id} />
          <input type="hidden" name="periodStart" value={isoDay(status.periodStart)} />
          <p className="muted" style={{ marginBottom: 6 }}>
            For {formatDay(status.periodStart)} – {formatDay(status.periodEnd)}. Answer every question, then submit. You can’t change your answers afterwards.
          </p>
          {status.cycle.questions.map((q, i) => (
            <div className="field" key={q.id}>
              <label htmlFor={`q_${q.id}`} style={{ textTransform: "none", fontSize: 16, letterSpacing: 0 }}>
                {i + 1}. {q.questionText}
              </label>
              {q.isLongAnswer ? (
                <textarea id={`q_${q.id}`} name={`q_${q.id}`} required maxLength={5000} />
              ) : (
                <input id={`q_${q.id}`} name={`q_${q.id}`} type="text" required maxLength={500} />
              )}
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <SubmitButton pendingText="Submitting…" confirm="Submit your check-in? You can’t edit it afterwards.">
              Submit check-in
            </SubmitButton>
          </div>
        </form>
      )}

      <div>
        <h2 className="h2">Past check-ins</h2>
        {past.length === 0 && <p className="muted">None yet.</p>}
        {past.map((s) => (
          <details key={s.id} className="card" style={{ marginBottom: 10 }}>
            <summary>
              {formatDay(s.periodStart)} {s.isMissed ? <span className="badge b-warn">Missed</span> : <span className="small muted">submitted {s.submittedAt ? formatDateTime(s.submittedAt) : ""}</span>}
            </summary>
            {[...s.responses]
              .sort((a, b) => a.question.order - b.question.order)
              .map((r) => (
                <div key={r.id} style={{ marginTop: 10 }}>
                  <strong>{r.question.questionText}</strong>
                  <p className="pre">{r.responseText}</p>
                </div>
              ))}
          </details>
        ))}
      </div>
    </div>
  );
}
