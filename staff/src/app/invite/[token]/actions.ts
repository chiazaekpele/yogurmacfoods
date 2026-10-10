"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { findInvite } from "@/lib/invite";
import { homeFor } from "@/lib/session";
import { assignOpenAllStaffTasks } from "@/lib/tasks";

export type InviteState = { error?: string; fields?: Record<string, string> } | null;

const schema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters.").max(128, "Use at most 128 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don’t match." });

export async function acceptInvite(token: string, _prev: InviteState, form: FormData): Promise<InviteState> {
  const user = await findInvite(token);
  if (!user) return { error: "This link has expired or has already been used. Ask the business owner to send a new invite." };

  const parsed = schema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) {
    return { fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  if (user.authUserId) {
    return { error: "This account already has a login. Ask the business owner to resend the invite." };
  }

  const { data, error } = await auth.signUp.email({ email: user.email, name: user.name, password: parsed.data.password });
  const authUserId = data?.user?.id;
  if (error || !authUserId) {
    console.error("Neon Auth sign-up failed:", error);
    return { error: "We couldn’t set up your login. Ask the business owner to resend the invite." };
  }

  // Single use: the token is cleared in the same write that activates the account.
  await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: user.id, inviteTokenHash: user.inviteTokenHash },
      data: { authUserId, isActive: true, inviteTokenHash: null, inviteExpiry: null, deactivatedAt: null, lastActiveAt: new Date() },
    });
    if (updated.count !== 1) throw new Error("Invite was used concurrently");
    if (user.role === "STAFF") await assignOpenAllStaffTasks(tx, user.id);
    await audit(tx, { actorId: user.id, action: "INVITE_ACCEPTED", entityType: "User", entityId: user.id });
  });

  // Sign-up normally signs the user in; if Neon Auth is set to require email
  // verification it does not, so send them to the sign-in page instead.
  const { data: session } = await auth.getSession();
  redirect(session?.user ? homeFor(user.role) : "/login?reason=activated");
}
