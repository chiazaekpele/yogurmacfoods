import { redirect } from "next/navigation";
import type { Customer } from "@/generated/prisma/client";
import { auth } from "./auth/server";
import { db } from "./db";

// The signed-in customer, or null. A Neon Auth login with no Customer row yet
// (e.g. the row write failed after sign-up) gets one on first use.
export async function getCustomer(): Promise<Customer | null> {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  const existing = await db.customer.findUnique({ where: { authUserId: user.id } });
  if (existing) return existing;
  // Admins share the login system but are not shoppers: no Customer row for them.
  if (await db.user.findUnique({ where: { authUserId: user.id }, select: { id: true } })) return null;
  return db.customer.upsert({
    where: { authUserId: user.id },
    update: {},
    create: { authUserId: user.id, email: user.email.toLowerCase(), name: user.name || user.email },
  });
}

// Paying requires an account (13 Oct 2026): signed-out visitors are asked to
// create one (with a link to sign in instead) and come straight back to `next`.
export async function requireCustomer(next: string): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect(`/account/sign-up?next=${encodeURIComponent(next)}`);
  return customer;
}

// Only same-site paths are allowed as a post-sign-in destination.
export function safeNext(next: unknown, fallback = "/account"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
