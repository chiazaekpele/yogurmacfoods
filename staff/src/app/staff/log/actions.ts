"use server";

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { backWith, firstError, optionalText, requiredText, str } from "@/lib/forms";
import { lagosDate } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";

const PATH = "/staff/log";
const EDIT_WINDOW_MS = 60 * 60 * 1000; // PRD §7.4

const schema = z.object({ activityText: requiredText(5000, "What you worked on"), generalSetbacks: optionalText(2000) });

export async function saveLog(form: FormData) {
  const staff = await requireRole("STAFF");
  const parsed = schema.safeParse({ activityText: str(form, "activityText"), generalSetbacks: str(form, "generalSetbacks") });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  const logDate = lagosDate();
  const now = new Date();

  const existing = await db.dailyLog.findUnique({ where: { staffId_logDate: { staffId: staff.id, logDate } } });
  if (existing) {
    if (existing.editableUntil <= now) backWith(PATH, "error", "Today’s log is locked. Logs can only be edited for an hour after you submit them.");
    await db.dailyLog.update({ where: { id: existing.id }, data: parsed.data });
    backWith(PATH, "ok", "Today’s log is updated.");
  }
  try {
    await db.dailyLog.create({ data: { ...parsed.data, staffId: staff.id, logDate, submittedAt: now, editableUntil: new Date(now.getTime() + EDIT_WINDOW_MS) } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") backWith(PATH, "error", "You’ve already submitted today’s log.");
    throw err;
  }
  backWith(PATH, "ok", "Thanks, today’s log is in. You can edit it for the next hour.");
}
