import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STAFF");
  const unread = await db.announcement.count({
    where: { scheduledFor: { lte: new Date() }, reads: { none: { staffId: user.id } } },
  });
  const links = [
    { href: "/staff/dashboard", label: "Today" },
    { href: "/staff/queue", label: "Production queue" },
    { href: "/staff/tasks", label: "My tasks" },
    { href: "/staff/log", label: "Daily log" },
    { href: "/staff/review", label: "Check-in" },
    { href: "/staff/announcements", label: "Announcements", badge: unread },
  ];
  return (
    <Shell label="Staff" name={user.name} links={links}>
      {children}
    </Shell>
  );
}
