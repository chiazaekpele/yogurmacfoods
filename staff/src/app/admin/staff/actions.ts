"use server";

import { z } from "zod";
import type { User } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { backWith, firstError, optionalText, requiredText, str } from "@/lib/forms";
import { inviteUrl, newInviteToken } from "@/lib/invite";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/session";

const PATH = "/admin/staff";

const inviteSchema = z.object({
  name: requiredText(100, "Name").pipe(z.string().min(2, "Enter their full name.")),
  email: z.email("Enter a valid email address.").max(254).transform((e) => e.toLowerCase()),
});

// Without Resend (local development) the link is printed to the terminal; show it too.
const devLink = (link: string) => (process.env.RESEND_API_KEY ? "" : ` Local test link: ${link}`);

// Issues a fresh token and emails it. A deactivated person being re-invited
// (the PRD's password-reset path) loses their old Neon Auth login first.
async function issueInvite(admin: User, user: User, back: string): Promise<string> {
  if (user.authUserId) {
    const { error } = await auth.admin.removeUser({ userId: user.authUserId });
    if (error) {
      console.error("Neon Auth removeUser failed:", error);
      backWith(
        back,
        "error",
        "Couldn’t reset this person’s old login. Your account needs the admin role in Neon Auth (Neon Console → Auth → Users → Make admin).",
      );
    }
  }
  const { token, hash, expiry } = newInviteToken();
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { inviteTokenHash: hash, inviteExpiry: expiry, authUserId: null, isActive: false } });
    await audit(tx, { actorId: admin.id, action: user.authUserId ? "STAFF_REINVITED" : "STAFF_INVITED", entityType: "User", entityId: user.id, newValue: { email: user.email } });
  });
  const link = inviteUrl(token);
  try {
    await sendInviteEmail(user, link);
  } catch (err) {
    console.error("Invite email failed:", err);
    backWith(back, "error", `The invite email to ${user.email} didn’t send. Use “Resend invite” to try again.`);
  }
  return link;
}

export async function inviteStaff(form: FormData) {
  const admin = await requireRole("ADMIN");
  const parsed = inviteSchema.safeParse({ name: str(form, "name"), email: str(form, "email") });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing?.isActive) backWith(PATH, "error", `${parsed.data.email} already has an active account.`);
  if (existing) backWith(PATH, "error", `${parsed.data.email} has already been invited. Use “Resend invite” on their row.`);

  const user = await db.user.create({ data: { ...parsed.data, role: "STAFF", isActive: false } });
  const link = await issueInvite(admin, user, PATH);
  backWith(PATH, "ok", `Invite sent to ${user.email}. The link expires in 24 hours.${devLink(link)}`);
}

export async function resendInvite(form: FormData) {
  const admin = await requireRole("ADMIN");
  const back = str(form, "back").startsWith("/admin/staff") ? str(form, "back") : PATH;
  if (!(await rateLimit("invite-resend", admin.id, { requests: 3, windowSeconds: 3600 }))) {
    backWith(back, "error", "You can resend at most 3 invites an hour. Please try again later.");
  }
  const user = await db.user.findUnique({ where: { id: str(form, "id") } });
  if (!user || user.role !== "STAFF") backWith(back, "error", "Staff member not found.");
  if (user.isActive) backWith(back, "error", `${user.name} already has an active account. Deactivate it first to reset their password.`);
  const link = await issueInvite(admin, user, back);
  backWith(back, "ok", `A new invite was sent to ${user.email}.${devLink(link)}`);
}

export async function deactivateStaff(form: FormData) {
  const admin = await requireRole("ADMIN");
  const back = str(form, "back").startsWith("/admin/staff") ? str(form, "back") : PATH;
  const user = await db.user.findUnique({ where: { id: str(form, "id") } });
  if (!user || user.role !== "STAFF") backWith(back, "error", "Staff member not found.");
  if (!user.isActive) backWith(back, "ok", `${user.name} is already deactivated.`);

  // isActive is checked on every request, so access ends now (PRD §4.3).
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { isActive: false, deactivatedAt: new Date(), inviteTokenHash: null, inviteExpiry: null } });
    await audit(tx, { actorId: admin.id, action: "STAFF_DEACTIVATED", entityType: "User", entityId: user.id, previousValue: { isActive: true }, newValue: { isActive: false } });
  });
  if (user.authUserId) {
    const { error } = await auth.admin.revokeUserSessions({ userId: user.authUserId });
    if (error) console.error("Neon Auth revokeUserSessions failed (access is still blocked by isActive):", error);
  }
  const active = await db.orderClaim.findFirst({ where: { staffId: user.id, markedReadyAt: null }, include: { order: { select: { orderId: true } } } });
  backWith(
    back,
    "ok",
    `${user.name} can no longer sign in.${active ? ` They were making ${active.order.orderId}: open it and move it back to Confirmed so someone else can claim it.` : ""}`,
  );
}

export async function saveAdminNote(form: FormData) {
  const admin = await requireRole("ADMIN");
  const back = str(form, "back").startsWith("/admin/staff") ? str(form, "back") : PATH;
  const parsed = optionalText(1000).safeParse(str(form, "note"));
  if (!parsed.success) backWith(back, "error", firstError(parsed.error));
  const response = await db.reviewResponse.findUnique({ where: { id: str(form, "id") } });
  if (!response) backWith(back, "error", "Response not found.");
  await db.$transaction(async (tx) => {
    await tx.reviewResponse.update({ where: { id: response.id }, data: { adminNote: parsed.data } });
    await audit(tx, { actorId: admin.id, action: "REVIEW_NOTE_SAVED", entityType: "ReviewResponse", entityId: response.id, previousValue: { note: response.adminNote }, newValue: { note: parsed.data } });
  });
  backWith(back, "ok", "Note saved.");
}
