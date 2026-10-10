import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Announcements" };

export default async function StaffAnnouncements() {
  const staff = await requireRole("STAFF");
  const list = await db.announcement.findMany({
    where: { scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "desc" },
    take: 100,
    select: { id: true, title: true, body: true, scheduledFor: true, reads: { where: { staffId: staff.id }, select: { id: true } } },
  });
  return (
    <div className="stack">
      <PageHead title="Announcements" />
      {list.length === 0 && <div className="card muted">No announcements yet.</div>}
      {list.map((a) => {
        const unread = a.reads.length === 0;
        return (
          <Link key={a.id} href={`/staff/announcements/${a.id}`} className={`card ${unread ? "unread" : ""}`} style={{ display: "block", textDecoration: "none" }}>
            <div className="row-between">
              <strong style={{ fontFamily: "var(--cond)", fontSize: 18, textTransform: "uppercase" }}>{a.title}</strong>
              {unread && <span className="badge b-in_production">New</span>}
            </div>
            <div className="small muted">{formatDateTime(a.scheduledFor)}</div>
            <p className="small" style={{ marginTop: 6 }}>
              {a.body.length > 140 ? `${a.body.slice(0, 140)}…` : a.body}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
