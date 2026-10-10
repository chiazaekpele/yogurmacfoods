"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { backWith, firstError, requiredText, str } from "@/lib/forms";
import { requireRole } from "@/lib/session";

const PATH = "/admin/announcements";

const schema = z.object({
  title: requiredText(140, "Title"),
  body: requiredText(5000, "Message"),
  // <input type="datetime-local"> in Lagos time (UTC+1).
  scheduledFor: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, "Choose a valid date and time.")
    .transform((s) => (s ? new Date(`${s}:00+01:00`) : new Date())),
});

export async function createAnnouncement(form: FormData) {
  const admin = await requireRole("ADMIN");
  const parsed = schema.safeParse({
    title: str(form, "title"),
    body: str(form, "body"),
    scheduledFor: str(form, "when") === "later" ? str(form, "scheduledFor") : "",
  });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  if (str(form, "when") === "later" && !str(form, "scheduledFor")) backWith(PATH, "error", "Choose when to post it.");

  await db.$transaction(async (tx) => {
    const a = await tx.announcement.create({ data: { ...parsed.data, createdById: admin.id } });
    await audit(tx, { actorId: admin.id, action: "ANNOUNCEMENT_CREATED", entityType: "Announcement", entityId: a.id, newValue: { title: a.title, scheduledFor: a.scheduledFor.toISOString() } });
  });
  backWith(PATH, "ok", parsed.data.scheduledFor > new Date() ? "Announcement scheduled." : "Announcement posted to all staff.");
}
