import { redirect } from "next/navigation";
import type { User } from "@/generated/prisma/client";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // signed out after 8 hours of inactivity
const TOUCH_EVERY_MS = 10 * 60 * 1000; // at most one activity write per 10 minutes

// Admins sign in with the shop's Neon Auth (same login system as customers);
// what makes someone an admin is an active User row with role ADMIN.
export async function getAdmin(): Promise<User | null> {
  const { data: session } = await auth.getSession();
  const authUserId = session?.user?.id;
  if (!authUserId) return null;
  const user = await db.user.findUnique({ where: { authUserId } });
  return user?.role === "ADMIN" && user.isActive ? user : null;
}

// Every admin page, server action and route handler calls this. It reads the
// account from the database on each request, so removing an admin applies at once.
export async function requireAdmin(): Promise<User> {
  const user = await getAdmin();
  if (!user) redirect("/admin");

  const now = Date.now();
  const last = user.lastActiveAt?.getTime() ?? now;
  if (now - last > IDLE_LIMIT_MS) redirect("/admin/sign-out?reason=expired");
  if (now - last > TOUCH_EVERY_MS) {
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date(now) } });
  }
  return user;
}
