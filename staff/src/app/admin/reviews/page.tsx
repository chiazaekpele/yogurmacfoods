import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { ReviewSetupForm } from "@/components/ReviewSetupForm";
import { db } from "@/lib/db";
import { formatDay, lagosDate } from "@/lib/lagos-time";
import { CADENCE_LABELS, cycleWhereForDay, periodEndFor, periodStartFor } from "@/lib/reviews";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requireRole("ADMIN");
  const today = lagosDate();
  const [current, upcoming, staff] = await Promise.all([
    db.reviewCycle.findFirst({ where: cycleWhereForDay(today), orderBy: { startDate: "desc" }, include: { questions: { orderBy: { order: "asc" } } } }),
    db.reviewCycle.findFirst({ where: { startDate: { gt: today }, endDate: null }, include: { questions: { orderBy: { order: "asc" } } } }),
    db.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const editing = upcoming ?? current;
  const period = current?.questions.length ? periodStartFor(current.startDate, current.cadence, today) : null;
  const submitted = period
    ? await db.reviewSubmission.findMany({ where: { cycleId: current!.id, periodStart: period, isMissed: false }, select: { staffId: true } })
    : [];
  const done = new Set(submitted.map((s) => s.staffId));

  return (
    <div className="stack">
      <PageHead title="Review check-ins" lede="Questions staff answer on a regular schedule. Expected outcomes are never shown to staff." />

      {current && period ? (
        <div className="card">
          <h2 className="h2">This period</h2>
          <p>
            {CADENCE_LABELS[current.cadence]} check-in, {formatDay(period)} – {formatDay(periodEndFor(period, current.cadence))}.{" "}
            <strong>
              {done.size} of {staff.length}
            </strong>{" "}
            staff have checked in.
          </p>
          <div className="pill-list" style={{ marginTop: 8 }}>
            {staff.map((s) => (
              <Link key={s.id} href={`/admin/staff/${s.id}`} className={`badge ${done.has(s.id) ? "b-on" : "b-pending"}`}>
                {s.name}
              </Link>
            ))}
          </div>
          {upcoming && <p className="hint" style={{ marginTop: 10 }}>Your edited questions start on {formatDay(upcoming.startDate)}.</p>}
        </div>
      ) : (
        <div className="card">
          <p className="muted">Check-ins are off. Add at least one question below to start them.</p>
        </div>
      )}

      <ReviewSetupForm
        cadence={editing?.cadence ?? "WEEKLY"}
        questions={(editing?.questions ?? []).map((q) => ({ questionText: q.questionText, expectedOutcome: q.expectedOutcome, isLongAnswer: q.isLongAnswer }))}
      />
    </div>
  );
}
