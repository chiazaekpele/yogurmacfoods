"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { getCustomer, safeNext } from "@/lib/customer";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { LAGOS_LGAS } from "@/lib/lgas";
import { phoneSchema } from "@/lib/validation";
import { siteUrl } from "@/lib/site";

// `values` echoes what was typed (never passwords) so fields keep their content:
// React clears a form after every submission.
export type FormState = { error?: string; ok?: string; fields?: Record<string, string>; values?: Record<string, string> } | null;

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
const fieldsOf = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const SECRET = new Set(["password", "confirm", "token"]);
const keep = (form: FormData) =>
  Object.fromEntries([...form.entries()].filter(([k, v]) => typeof v === "string" && !SECRET.has(k) && !k.startsWith("$")) as [string, string][]);

const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");
const password = z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters");

const signUpSchema = z
  .object({ name: z.string().trim().min(2, "Enter your full name").max(100), email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don’t match" });

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("account-signup", await ip(), { requests: 5, windowSeconds: 600 }))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldsOf(parsed.error), values: keep(form) };
  const { name, email: addr, password: pw } = parsed.data;

  const { data, error } = await auth.signUp.email({ name, email: addr, password: pw });
  if (error || !data?.user?.id) {
    const exists = /exist/i.test(error?.message ?? "");
    if (!exists) console.error("Customer sign-up failed:", error);
    return exists
      ? { error: "An account with this email already exists. Sign in instead, or reset your password.", values: keep(form) }
      : { error: "We couldn’t create your account. Please try again.", values: keep(form) };
  }
  await db.customer.upsert({ where: { authUserId: data.user.id }, update: { name }, create: { authUserId: data.user.id, email: addr, name } });
  const next = safeNext(form.get("next"));
  const { data: session } = await auth.getSession();
  // If Neon Auth is set to require email verification, there is no session yet.
  redirect(session?.user ? next : `/account/sign-in?next=${encodeURIComponent(next)}&notice=verify`);
}

const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(128) });
const GENERIC = "That email and password don’t match an account.";

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("account-signin", await ip(), { requests: 10, windowSeconds: 600 }))) {
    return { error: "Too many sign-in attempts. Please wait 10 minutes and try again." };
  }
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldsOf(parsed.error), values: keep(form) };
  const { data, error } = await auth.signIn.email(parsed.data);
  if (error || !data?.user?.id) return { error: GENERIC, values: keep(form) };
  await getCustomer();
  redirect(safeNext(form.get("next")));
}

export async function signOut(): Promise<void> {
  await auth.signOut().catch(() => undefined);
  redirect("/");
}

// Always the same reply, so it never reveals which emails have accounts.
export async function requestReset(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("account-reset", await ip(), { requests: 5, windowSeconds: 3600 }))) {
    return { error: "Too many requests. Please try again later." };
  }
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { fields: { email: parsed.error.issues[0].message }, values: keep(form) };
  const site = siteUrl();
  const { error } = await auth.requestPasswordReset({ email: parsed.data, redirectTo: `${site}/account/reset` });
  if (error) console.error("Password reset request failed:", error);
  return { ok: "If there’s an account for that email, we’ve sent a link to reset your password. Check your inbox." };
}

const resetSchema = z
  .object({ token: z.string().min(1).max(500), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don’t match" });

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldsOf(parsed.error), values: keep(form) };
  const { error } = await auth.resetPassword({ token: parsed.data.token, newPassword: parsed.data.password });
  if (error) return { error: "This reset link has expired or has already been used. Request a new one." };
  redirect("/account/sign-in?notice=reset");
}

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.union([z.literal(""), phoneSchema]),
  lga: z.union([z.literal(""), z.enum(LAGOS_LGAS)]),
  exactAddress: z.string().trim().max(300),
  landmark: z.string().trim().max(150),
});

export async function saveDetails(_prev: FormState, form: FormData): Promise<FormState> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/sign-in?next=/account");
  const parsed = detailsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldsOf(parsed.error), values: keep(form) };
  const d = parsed.data;
  await db.customer.update({
    where: { id: customer.id },
    data: { name: d.name, phone: d.phone || null, lga: d.lga || null, exactAddress: d.exactAddress || null, landmark: d.landmark || null },
  });
  return { ok: "Your details are saved. They’ll be filled in for you at checkout.", values: keep(form) };
}

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5),
  body: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(1000, "Keep it under 1,000 characters"),
  displayName: z.string().trim().min(2, "Enter the name to show with your review").max(60),
});

// One review per delivered order; it shows on the shop once the owner approves it.
export async function writeReview(orderId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const customer = await getCustomer();
  if (!customer) redirect(`/account/sign-in?next=/account/review/${encodeURIComponent(orderId)}`);
  const order = await db.order.findUnique({ where: { orderId }, select: { id: true, customerId: true, status: true, review: { select: { id: true } } } });
  if (!order || order.customerId !== customer.id) return { error: "We couldn’t find that order on your account." };
  if (order.status !== "DELIVERED") return { error: "You can review an order once it has been delivered." };
  if (order.review) redirect("/account?notice=review");
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldsOf(parsed.error), values: keep(form) };
  await db.customerReview.create({ data: { orderId: order.id, customerId: customer.id, ...parsed.data } });
  redirect("/account?notice=review");
}
