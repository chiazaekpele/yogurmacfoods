import { forbidden, redirect } from "next/navigation";
import type { Role, User } from "@/generated/prisma/client";
import { auth } from "./auth/server";
import { db } from "./db";

const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // PRD §4.1: 8 hours of inactivity
const TOUCH_EVERY_MS = 10 * 60 * 1000; // TRD §9.2: at most one write per 10 minutes

// The portal account behind the current Neon Auth session, or null.
export async function getSessionUser(): Promise<User | null> {
  const { data: session } = await auth.getSession();
  const authUserId = session?.user?.id;
  if (!authUserId) return null;
  return db.user.findUnique({ where: { authUserId } });
}

// Every protected page, server action and route handler calls this (TRD §9.4).
// It reads the account from the database on each request, so deactivation and
// role changes apply immediately, whatever the session cookie says.
export async function requireRole(role: Role): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/logout?reason=inactive");

  const now = Date.now();
  const last = user.lastActiveAt?.getTime() ?? now;
  if (now - last > IDLE_LIMIT_MS) redirect("/logout?reason=expired");
  if (user.role !== role) forbidden();

  if (now - last > TOUCH_EVERY_MS) {
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date(now) } });
  }
  return user;
}

export const homeFor = (role: Role) => (role === "ADMIN" ? "/admin/dashboard" : "/staff/dashboard");
