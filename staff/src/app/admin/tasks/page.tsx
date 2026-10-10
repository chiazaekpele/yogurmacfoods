import type { Metadata } from "next";
import Link from "next/link";
import type { TaskStatus } from "@/generated/prisma/client";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime, formatDay, lagosDate } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";
import { createTask } from "./actions";

export const metadata: Metadata = { title: "Tasks" };

const STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"];
const LABELS = { PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Completed", BLOCKED: "Blocked" } as const;

export default async function AdminTasksPage({ searchParams }: PageProps<"/admin/tasks">) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const staffFilter = typeof sp.staff === "string" ? sp.staff : "";
  const statusFilter = (typeof sp.status === "string" ? sp.status : "") as TaskStatus | "";
  const openTask = typeof sp.task === "string" ? sp.task : "";

  const [staff, tasks] = await Promise.all([
    db.user.findMany({ where: { role: "STAFF", isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.task.findMany({
      where: {
        assignments: {
          some: {
            ...(staffFilter ? { staffId: staffFilter } : {}),
            ...(STATUSES.includes(statusFilter as TaskStatus) ? { status: statusFilter as TaskStatus } : {}),
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { assignments: { include: { staff: { select: { name: true } } }, orderBy: { staff: { name: "asc" } } } },
    }),
  ]);
  const today = lagosDate();

  return (
    <div className="stack">
      <PageHead title="Tasks" lede="Give a task to one person or to the whole team. Everyone tracks their own progress." />
      <Flash searchParams={searchParams} />

      <details className="card" open={tasks.length === 0}>
        <summary>New task</summary>
        <form action={createTask} style={{ marginTop: 12, maxWidth: 560 }}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" required maxLength={140} />
          </div>
          <div className="field">
            <label htmlFor="description">Description (optional)</label>
            <textarea id="description" name="description" maxLength={2000} />
          </div>
          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="assignee">Assign to</label>
              <select id="assignee" name="assignee" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                <option value="ALL">All staff</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor="dueDate">Due date (optional)</label>
              <input id="dueDate" name="dueDate" type="date" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <SubmitButton>Assign task</SubmitButton>
          </div>
        </form>
      </details>

      <form className="filters">
        <div className="field">
          <label htmlFor="staff">Person</label>
          <select id="staff" name="staff" defaultValue={staffFilter}>
            <option value="">Everyone</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={statusFilter}>
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn">Filter</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Assigned to</th>
              <th>Progress</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const done = t.assignments.filter((a) => a.status === "COMPLETED").length;
              const blocked = t.assignments.filter((a) => a.status === "BLOCKED");
              const single = !t.assignToAll ? t.assignments[0] : null;
              const overdue = t.dueDate && t.dueDate < today && done < t.assignments.length;
              const expanded = openTask === t.id;
              return (
                <tr key={t.id}>
                  <td>
                    <Link href={expanded ? "/admin/tasks" : `/admin/tasks?task=${t.id}`}>
                      <strong>{t.title}</strong>
                    </Link>
                    <div className="small muted">created {formatDateTime(t.createdAt)}</div>
                    {expanded && (
                      <div style={{ marginTop: 10 }}>
                        {t.description && <p className="pre small">{t.description}</p>}
                        <ul className="timeline" style={{ marginTop: 8 }}>
                          {t.assignments.map((a) => (
                            <li key={a.id}>
                              {a.staff.name}: <span className={`badge b-${a.status.toLowerCase()}`}>{LABELS[a.status]}</span>
                              {a.blockerNote && <div className="small" style={{ color: "var(--red)" }}>Blocker: {a.blockerNote}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td>{t.assignToAll ? "All staff" : single?.staff.name}</td>
                  <td>
                    {single ? (
                      <span className={`badge b-${single.status.toLowerCase()}`}>{LABELS[single.status]}</span>
                    ) : (
                      <>
                        {done}/{t.assignments.length} done
                      </>
                    )}
                    {t.assignToAll && blocked.length > 0 && <div className="small" style={{ color: "var(--red)" }}>{blocked.length} blocked</div>}
                    {single?.blockerNote && single.status === "BLOCKED" && <div className="small" style={{ color: "var(--red)" }}>{single.blockerNote}</div>}
                  </td>
                  <td className="small" style={{ color: overdue ? "var(--red)" : undefined }}>
                    {t.dueDate ? formatDay(t.dueDate) : "—"}
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  No tasks match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
