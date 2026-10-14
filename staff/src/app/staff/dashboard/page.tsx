import type { Metadata } from "next";
import Link from "next/link";
import { OrderItems } from "@/components/OrderItems";
import { PageHead } from "@/components/PageHead";
import { db } from "@/lib/db";
import { formatDay, lagosDate } from "@/lib/lagos-time";
import { reviewStatus } from "@/lib/review-status";
import { requireRole } from "@/lib/session";
import { activeClaim } from "@/lib/staff-orders";
import { TASK_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Today" };

export default async function StaffDashboard() {
  const staff = await requireRole("STAFF");
  const today = lagosDate();
  const [review, unread, tasks, queueCount, mine, loggedToday] = await Promise.all([
    reviewStatus(staff.id),
    db.announcement.count({ where: { scheduledFor: { lte: new Date() }, reads: { none: { staffId: staff.id } } } }),
    db.taskAssignment.findMany({
      where: { staffId: staff.id, status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] } },
      include: { task: { select: { title: true, dueDate: true } } },
      orderBy: { task: { dueDate: { sort: "asc", nulls: "last" } } },
      take: 8,
    }),
    db.order.count({ where: { status: "CONFIRMED" } }),
    activeClaim(staff.id),
    db.dailyLog.count({ where: { staffId: staff.id, logDate: today } }),
  ]);

  return (
    <div className="stack">
      <PageHead eyebrow={formatDay(today)} title={`Good to see you, ${staff.name.split(" ")[0]}`} />

      {review?.due && (
        <div className="banner">
          <div>
            <strong>Your check-in is due</strong>
            <div className="small">Answer this period’s questions before {formatDay(review.periodEnd)} ends.</div>
          </div>
          <Link className="btn" href="/staff/review">
            Complete check-in
          </Link>
        </div>
      )}

      {mine ? (
        <div className="card card-dark">
          <div className="row-between">
            <div className="stat-label">You’re making</div>
            <Link className="btn btn-gold btn-sm" href={`/staff/queue/${mine.order.orderId}`}>
              Open order
            </Link>
          </div>
          <div className="stat-value mono" style={{ fontSize: 22 }}>
            {mine.order.orderId}
          </div>
          <div style={{ marginTop: 8 }}>
            <OrderItems items={mine.order.items} />
          </div>
        </div>
      ) : null}

      <div className="grid grid-3">
        <Link href="/staff/queue" className="card" style={{ textDecoration: "none" }}>
          <div className="stat-label">Orders waiting</div>
          <div className="stat-value">{queueCount}</div>
          <div className="stat-sub">in the production queue</div>
        </Link>
        <Link href="/staff/announcements" className="card" style={{ textDecoration: "none" }}>
          <div className="stat-label">Unread announcements</div>
          <div className="stat-value">{unread}</div>
        </Link>
        <Link href="/staff/log" className="card" style={{ textDecoration: "none" }}>
          <div className="stat-label">Daily log</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{loggedToday ? "Done today" : "Not yet"}</div>
        </Link>
      </div>

      <div className="card">
        <div className="row-between">
          <h2 className="h2">My tasks</h2>
          <Link href="/staff/tasks" className="small">
            Task board →
          </Link>
        </div>
        {tasks.length === 0 && <p className="muted">No open tasks.</p>}
        {tasks.map((t) => (
          <div key={t.id} className="row-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span>
              {t.task.title}
              {t.task.dueDate && <span className="small muted"> · due {formatDay(t.task.dueDate)}</span>}
            </span>
            <span className={`badge b-${t.status.toLowerCase()}`}>{TASK_LABELS[t.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
