import type { Metadata } from "next";
import { PageHead } from "@/components/PageHead";
import { TaskBoard } from "@/components/TaskBoard";
import { db } from "@/lib/db";
import { formatDay, lagosDate } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "My tasks" };

export default async function StaffTasksPage() {
  const staff = await requireRole("STAFF");
  const today = lagosDate();
  const recentlyDone = new Date(Date.now() - 14 * 86_400_000);
  const rows = await db.taskAssignment.findMany({
    where: { staffId: staff.id, OR: [{ status: { not: "COMPLETED" } }, { completedAt: { gte: recentlyDone } }] },
    include: { task: true },
    orderBy: [{ task: { dueDate: { sort: "asc", nulls: "last" } } }, { createdAt: "asc" }],
  });
  return (
    <div>
      <PageHead title="My tasks" lede="Drag a task between columns, or use its buttons. Completed tasks stay here for two weeks." />
      <TaskBoard
        tasks={rows.map((a) => ({
          id: a.id,
          title: a.task.title,
          description: a.task.description,
          due: a.task.dueDate ? formatDay(a.task.dueDate) : null,
          overdue: !!a.task.dueDate && a.task.dueDate < today && a.status !== "COMPLETED",
          status: a.status,
          blockerNote: a.blockerNote,
        }))}
      />
    </div>
  );
}
