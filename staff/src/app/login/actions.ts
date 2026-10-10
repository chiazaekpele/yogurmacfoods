"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request";
import { homeFor } from "@/lib/session";

export type LoginState = { error?: string } | null;

// Same message whatever went wrong, so it never reveals which emails exist (TRD §9.1).
const GENERIC = "That email and password don’t match an active account.";

const schema = z.object({ email: z.email().max(254).transform((s) => s.toLowerCase()), password: z.string().min(1).max(200) });

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!(await rateLimit("login", await requestIp(), { requests: 5, windowSeconds: 600 }))) {
    return { error: "Too many sign-in attempts. Please wait 10 minutes and try again." };
  }
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: GENERIC };

  const { data, error } = await auth.signIn.email(parsed.data);
  const authUserId = data?.user?.id;
  if (error || !authUserId) return { error: GENERIC };

  const user = await db.user.findUnique({ where: { authUserId } });
  if (!user?.isActive) {
    await auth.signOut();
    return { error: GENERIC };
  }
  await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  redirect(homeFor(user.role));
}
