import type { Metadata } from "next";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";
import { createAnnouncement } from "./actions";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncements({ searchParams }: PageProps<"/admin/announcements">) {
  await requireRole("ADMIN");
  const [list, staffCount] = await Promise.all([
    db.announcement.findMany({ orderBy: { scheduledFor: "desc" }, take: 100, include: { _count: { select: { reads: true } } } }),
    db.user.count({ where: { role: "STAFF", isActive: true } }),
  ]);
  const now = new Date();

  return (
    <div className="stack">
      <PageHead title="Announcements" lede="Messages to every staff member. Staff can’t reply." />
      <Flash searchParams={searchParams} />

      <form action={createAnnouncement} className="card" style={{ maxWidth: 640 }}>
        <h2 className="h2">New announcement</h2>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" type="text" required maxLength={140} />
        </div>
        <div className="field">
          <label htmlFor="body">Message</label>
          <textarea id="body" name="body" required maxLength={5000} />
        </div>
        <fieldset className="field" style={{ border: "none" }}>
          <legend className="label">When</legend>
          <label className="check">
            <input type="radio" name="when" value="now" defaultChecked /> Post now
          </label>
          <label className="check">
            <input type="radio" name="when" value="later" /> Schedule for
            <input name="scheduledFor" type="datetime-local" aria-label="Scheduled date and time (Lagos time)" style={{ width: "auto" }} />
          </label>
          <span className="hint">Times are Lagos time.</span>
        </fieldset>
        <div style={{ marginTop: 12 }}>
          <SubmitButton pendingText="Posting…">Save announcement</SubmitButton>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Announcement</th>
              <th>Posted</th>
              <th className="num">Read by</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.title}</strong>
                  <div className="small muted pre">{a.body.length > 160 ? `${a.body.slice(0, 160)}…` : a.body}</div>
                </td>
                <td className="small">
                  {a.scheduledFor > now ? <span className="badge b-pending">Scheduled</span> : null} {formatDateTime(a.scheduledFor)}
                </td>
                <td className="num">
                  {a._count.reads} / {staffCount}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">
                  No announcements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
