"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TaskStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requiredText } from "@/lib/forms";
import { requireRole } from "@/lib/session";

export type TaskResult = { error?: string };

const MOVABLE: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

// Scoped to the signed-in staff member's own assignment (TRD §9.4).
export async function moveTask(assignmentId: string, status: TaskStatus): Promise<TaskResult> {
  const staff = await requireRole("STAFF");
  if (!MOVABLE.includes(status)) return { error: "Unknown column." };
  const { count } = await db.taskAssignment.updateMany({
    where: { id: assignmentId, staffId: staff.id },
    // Moving a blocked task anywhere clears the blocker.
    data: { status, blockerNote: null, completedAt: status === "COMPLETED" ? new Date() : null },
  });
  if (!count) return { error: "That task is no longer assigned to you." };
  revalidatePath("/staff/tasks");
  revalidatePath("/staff/dashboard");
  return {};
}

export async function raiseBlocker(assignmentId: string, note: string): Promise<TaskResult> {
  const staff = await requireRole("STAFF");
  const parsed = requiredText(1000, "A short description of the blocker").safeParse(note);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { count } = await db.taskAssignment.updateMany({
    where: { id: assignmentId, staffId: staff.id, status: { not: "COMPLETED" } },
    data: { status: "BLOCKED", blockerNote: parsed.data, completedAt: null },
  });
  if (!count) return { error: "That task can’t be blocked." };
  revalidatePath("/staff/tasks");
  return {};
}
