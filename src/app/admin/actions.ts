"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

// `values` echoes what was typed (never passwords or the code): React clears a
// form after every submission.
export type AuthState = { error?: string; fields?: Record<string, string>; values?: Record<string, string> } | null;

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
const fieldsOf = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const keep = (form: FormData, ...names: string[]) => Object.fromEntries(names.map((n) => [n, String(form.get(n) ?? "")]));

const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");

// Same message whatever went wrong, so it never reveals which emails exist.
const GENERIC = "That email and password don’t match an admin account.";

export async function adminSignIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!(await rateLimit("admin-signin", await ip(), { requests: 5, windowSeconds: 600 }))) {
    return { error: "Too many sign-in attempts. Please wait 10 minutes and try again.", values: keep(form, "email") };
  }
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password").max(128) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldsOf(parsed.error), values: keep(form, "email") };

  const { data, error } = await auth.signIn.email(parsed.data);
  const authUserId = data?.user?.id;
  if (error || !authUserId) return { error: GENERIC, values: keep(form, "email") };

  const user = await db.user.findUnique({ where: { authUserId } });
  if (user?.role !== "ADMIN" || !user.isActive) {
    await auth.signOut().catch(() => undefined);
    return { error: GENERIC, values: keep(form, "email") };
  }
  await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  redirect("/admin/dashboard");
}

// New admins need the sign-up code (ADMIN_SIGNUP_CODE). Without it set, sign-up is closed.
function codeMatches(given: string): boolean {
  const want = process.env.ADMIN_SIGNUP_CODE?.trim();
  if (!want) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given.trim()), h(want));
}

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email,
    password: z.string().min(10, "Use at least 10 characters").max(128, "Use at most 128 characters"),
    confirm: z.string(),
    code: z.string().min(1, "Enter the sign-up code").max(200),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don’t match" });

export async function adminSignUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const values = keep(form, "name", "email");
  if (!(await rateLimit("admin-signup", await ip(), { requests: 5, windowSeconds: 600 }))) {
    return { error: "Too many attempts. Please wait 10 minutes and try again.", values };
  }
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldsOf(parsed.error), values };
  const { name, email: addr, password, code } = parsed.data;
  if (!codeMatches(code)) return { fields: { code: "That sign-up code isn’t right. Ask the business owner for it." }, values };

  // A customer of the shop may already have a login with this email: their
  // current password proves it is theirs, and the same login becomes an admin.
  let authUserId: string | undefined;
  const created = await auth.signUp.email({ name, email: addr, password });
  if (created.data?.user?.id) authUserId = created.data.user.id;
  else if (/exist/i.test(created.error?.message ?? "")) {
    const signedIn = await auth.signIn.email({ email: addr, password });
    authUserId = signedIn.data?.user?.id;
    if (!authUserId) return { error: "This email already has a login. Enter its current password, or use another email.", values };
  } else {
    console.error("Admin sign-up failed:", created.error);
    return { error: "We couldn’t create the account. Please try again.", values };
  }

  const existing = await db.user.findFirst({ where: { OR: [{ email: addr }, { authUserId }] } });
  if (existing && existing.authUserId && existing.authUserId !== authUserId) {
    return { error: "This email is already used by another admin account.", values };
  }
  await db.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { name, authUserId, role: "ADMIN", isActive: true, deactivatedAt: null, lastActiveAt: new Date() } })
      : await tx.user.create({ data: { name, email: addr, authUserId, role: "ADMIN", isActive: true, lastActiveAt: new Date() } });
    await audit(tx, { actorId: user.id, action: "ADMIN_SIGNED_UP", entityType: "User", entityId: user.id });
  });

  // Sign-up normally signs the user in; if Neon Auth requires email
  // verification it does not, so send them to the sign-in page instead.
  const { data: session } = await auth.getSession();
  redirect(session?.user ? "/admin/dashboard" : "/admin?reason=created");
}
