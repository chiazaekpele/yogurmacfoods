import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Announcement" };

export default async function StaffAnnouncement({ params }: PageProps<"/staff/announcements/[id]">) {
  const staff = await requireRole("STAFF");
  const { id } = await params;
  const a = await db.announcement.findFirst({ where: { id, scheduledFor: { lte: new Date() } }, select: { id: true, title: true, body: true, scheduledFor: true } });
  if (!a) notFound();
  // Opening it marks it read (PRD §7.6). Idempotent.
  await db.announcementRead.upsert({
    where: { announcementId_staffId: { announcementId: a.id, staffId: staff.id } },
    update: {},
    create: { announcementId: a.id, staffId: staff.id },
  });
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="small">
        <Link href="/staff/announcements">← Announcements</Link>
      </div>
      <PageHead eyebrow={formatDateTime(a.scheduledFor)} title={a.title} />
      <div className="card">
        <p className="pre">{a.body}</p>
      </div>
    </div>
  );
}
