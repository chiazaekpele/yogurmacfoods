import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isSameOrigin } from "@/lib/origin";

// GET is used for forced sign-outs (session expired); the sign-out button POSTs.
async function signOut(req: Request, reason: string) {
  await auth.signOut().catch((err: unknown) => console.error("signOut failed:", err));
  return NextResponse.redirect(new URL(`/admin?reason=${reason}`, req.url), 303);
}

export async function GET(req: Request) {
  return signOut(req, new URL(req.url).searchParams.get("reason") === "expired" ? "expired" : "signedout");
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new NextResponse(null, { status: 403 });
  return signOut(req, "signedout");
}
