import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isSameOrigin } from "@/lib/origin";

// The admin "Sign out" button. Expired logins need no sign-out: the admin
// pages treat them as signed out (lib/admin/session.ts).
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new NextResponse(null, { status: 403 });
  await auth.signOut().catch((err: unknown) => console.error("signOut failed:", err));
  return NextResponse.redirect(new URL("/admin?reason=signedout", req.url), 303);
}
