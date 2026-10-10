import type { Prisma } from "@/generated/prisma/client";

// "All Staff" tasks get a row per staff member, including people who join
// after the task was created (TRD §5.4).
export async function assignOpenAllStaffTasks(tx: Prisma.TransactionClient, staffId: string) {
  const tasks = await tx.task.findMany({
    where: { assignToAll: true, assignments: { some: { status: { not: "COMPLETED" } } } },
    select: { id: true },
  });
  if (tasks.length) {
    await tx.taskAssignment.createMany({ data: tasks.map((t) => ({ taskId: t.id, staffId })), skipDuplicates: true });
  }
}
