import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatDay, lagosDate } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";
import { deactivateStaff, resendInvite, saveAdminNote } from "../actions";
import { SETBACK_LABELS, TASK_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Staff member" };

export default async function StaffDetail({ params, searchParams }: PageProps<"/admin/staff/[id]">) {
  await requireRole("ADMIN");
  const { id } = await params;
  const s = await db.user.findUnique({ where: { id } });
  if (!s || s.role !== "STAFF") notFound();
  const back = `/admin/staff/${s.id}`;
  const today = lagosDate();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [produced, tasksDone, logsThisMonth, submissions, assignments, setbacks, logs] = await Promise.all([
    db.orderClaim.count({ where: { staffId: s.id, markedReadyAt: { not: null } } }),
    db.taskAssignment.count({ where: { staffId: s.id, status: "COMPLETED" } }),
    db.dailyLog.count({ where: { staffId: s.id, logDate: { gte: monthStart } } }),
    db.reviewSubmission.findMany({
      where: { staffId: s.id },
      orderBy: { periodStart: "desc" },
      take: 20,
      include: { responses: { include: { question: true }, orderBy: { question: { order: "asc" } } } },
    }),
    db.taskAssignment.findMany({ where: { staffId: s.id }, orderBy: { updatedAt: "desc" }, take: 30, include: { task: true } }),
    db.setbackReport.findMany({ where: { staffId: s.id }, orderBy: { createdAt: "desc" }, take: 30, include: { order: { select: { orderId: true } } } }),
    db.dailyLog.findMany({ where: { staffId: s.id }, orderBy: { logDate: "desc" }, take: 7 }),
  ]);
  const missed = submissions.filter((x) => x.isMissed);

  return (
    <div className="stack">
      <div className="small">
        <Link href="/admin/staff">← Staff</Link>
      </div>
      <PageHead eyebrow={s.isActive ? "Active" : s.deactivatedAt ? "Deactivated" : "Invited"} title={s.name} lede={`${s.email} · joined ${formatDate(s.createdAt)} · last active ${s.lastActiveAt ? formatDateTime(s.lastActiveAt) : "never"}`}>
        {s.isActive ? (
          <form action={deactivateStaff}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="back" value={back} />
            <SubmitButton className="btn btn-danger" confirm={`Deactivate ${s.name}? They will be signed out immediately.`}>
              Deactivate
            </SubmitButton>
          </form>
        ) : (
          <form action={resendInvite}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="back" value={back} />
            <SubmitButton className="btn btn-ghost" pendingText="Sending…">
              {s.deactivatedAt ? "Re-invite (reset password)" : "Resend invite"}
            </SubmitButton>
          </form>
        )}
      </PageHead>
      <Flash searchParams={searchParams} />

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-label">Orders produced</div>
          <div className="stat-value">{produced}</div>
        </div>
        <div className="card">
          <div className="stat-label">Tasks completed</div>
          <div className="stat-value">{tasksDone}</div>
        </div>
        <div className="card">
          <div className="stat-label">Daily logs this month</div>
          <div className="stat-value">{logsThisMonth}</div>
        </div>
        <div className="card">
          <div className="stat-label">Missed check-ins</div>
          <div className="stat-value" style={{ color: missed.length ? "var(--red)" : undefined }}>
            {missed.length}
          </div>
          <div className="stat-sub">of the last {submissions.length}</div>
        </div>
      </div>

      <div>
        <h2 className="h2">Review check-ins</h2>
        {submissions.length === 0 && <p className="muted">No check-ins yet.</p>}
        {submissions.map((sub) => (
          <details key={sub.id} className="card" style={{ marginBottom: 10 }} open={sub === submissions[0] && !sub.isMissed}>
            <summary>
              Period from {formatDay(sub.periodStart)}{" "}
              {sub.isMissed ? <span className="badge b-warn">Missed</span> : <span className="small muted">submitted {sub.submittedAt ? formatDateTime(sub.submittedAt) : ""}</span>}
            </summary>
            {sub.responses.map((r) => (
              <div key={r.id} style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <strong>{r.question.questionText}</strong>
                <div className="grid grid-2" style={{ marginTop: 6 }}>
                  <div>
                    <div className="stat-label">Their answer</div>
                    <p className="pre">{r.responseText}</p>
                  </div>
                  <div>
                    <div className="stat-label">Expected outcome</div>
                    <p className="pre muted">{r.question.expectedOutcome}</p>
                  </div>
                </div>
                <form action={saveAdminNote} className="row" style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="back" value={back} />
                  <input name="note" type="text" maxLength={1000} defaultValue={r.adminNote ?? ""} placeholder="Private note (only you can see this)" aria-label="Private note" style={{ flex: 1, minWidth: 200 }} />
                  <SubmitButton className="btn btn-sm btn-ghost">Save note</SubmitButton>
                </form>
              </div>
            ))}
          </details>
        ))}
      </div>

      <div className="grid grid-2">
        <div>
          <h2 className="h2">Tasks</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/admin/tasks?task=${a.taskId}`}>{a.task.title}</Link>
                      {a.blockerNote && <div className="small" style={{ color: "var(--red)" }}>Blocker: {a.blockerNote}</div>}
                    </td>
                    <td>
                      <span className={`badge b-${a.status.toLowerCase()}`}>{TASK_LABELS[a.status]}</span>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td className="empty">No tasks.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="h2">Setbacks reported</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {setbacks.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/admin/orders/${x.order.orderId}`} className="mono">
                        {x.order.orderId}
                      </Link>{" "}
                      · {SETBACK_LABELS[x.category]}
                      <div className="small">{x.description}</div>
                    </td>
                    <td className="small muted">{formatDate(x.createdAt)}</td>
                  </tr>
                ))}
                {setbacks.length === 0 && (
                  <tr>
                    <td className="empty">None.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="h2">Recent daily logs</h2>
        {logs.length === 0 && <p className="muted">No logs yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="card" style={{ marginBottom: 10 }}>
            <div className="stat-label">{formatDay(l.logDate)}</div>
            <p className="pre">{l.activityText}</p>
            {l.generalSetbacks && <p className="pre small muted">Setbacks: {l.generalSetbacks}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
