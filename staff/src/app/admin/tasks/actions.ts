"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { backWith, firstError, optionalText, requiredText, str } from "@/lib/forms";
import { requireRole } from "@/lib/session";

const PATH = "/admin/tasks";

const schema = z.object({
  title: requiredText(140, "Title"),
  description: optionalText(2000),
  assignee: z.string().min(1, "Choose who the task is for."),
  dueDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Choose a valid due date.")
    .transform((s) => (s ? new Date(`${s}T00:00:00Z`) : null)),
});

export async function createTask(form: FormData) {
  const admin = await requireRole("ADMIN");
  const parsed = schema.safeParse({ title: str(form, "title"), description: str(form, "description"), assignee: str(form, "assignee"), dueDate: str(form, "dueDate") });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  const { assignee, ...task } = parsed.data;
  const all = assignee === "ALL";

  const staffIds = all
    ? (await db.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true } })).map((u) => u.id)
    : (await db.user.findMany({ where: { id: assignee, role: "STAFF", isActive: true }, select: { id: true } })).map((u) => u.id);
  if (!staffIds.length) backWith(PATH, "error", all ? "There are no active staff to assign this to yet." : "That staff member isn’t active.");

  await db.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: { ...task, assignToAll: all, createdById: admin.id, assignments: { create: staffIds.map((staffId) => ({ staffId })) } },
    });
    await audit(tx, { actorId: admin.id, action: "TASK_CREATED", entityType: "Task", entityId: created.id, newValue: { title: task.title, assignToAll: all, staff: staffIds.length } });
  });
  backWith(PATH, "ok", `Task “${task.title}” assigned.`);
}
