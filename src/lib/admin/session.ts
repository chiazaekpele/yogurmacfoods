import { redirect } from "next/navigation";
import type { User } from "@/generated/prisma/client";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // signed out after 8 hours of inactivity
const TOUCH_EVERY_MS = 10 * 60 * 1000; // at most one activity write per 10 minutes

// Admins sign in with the shop's Neon Auth (same login system as customers);
// what makes someone an admin is an active User row with role ADMIN. A login
// idle for 8 hours counts as signed out everywhere, so the login page and the
// panel always agree (they used to disagree and redirect in a loop).
async function adminSession(): Promise<{ user: User | null; expired: boolean }> {
  const { data: session } = await auth.getSession();
  const authUserId = session?.user?.id;
  if (!authUserId) return { user: null, expired: false };
  const user = await db.user.findUnique({ where: { authUserId } });
  if (user?.role !== "ADMIN" || !user.isActive) return { user: null, expired: false };
  const last = user.lastActiveAt?.getTime() ?? Date.now();
  return Date.now() - last > IDLE_LIMIT_MS ? { user: null, expired: true } : { user, expired: false };
}

export async function getAdmin(): Promise<User | null> {
  return (await adminSession()).user;
}

// Every admin page, server action and route handler calls this. It reads the
// account from the database on each request, so removing an admin applies at once.
export async function requireAdmin(): Promise<User> {
  const { user, expired } = await adminSession();
  if (!user) redirect(expired ? "/admin?reason=expired" : "/admin");
  const now = Date.now();
  if (now - (user.lastActiveAt?.getTime() ?? 0) > TOUCH_EVERY_MS) {
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date(now) } });
  }
  return user;
}
