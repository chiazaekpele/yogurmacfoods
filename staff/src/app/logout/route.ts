import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const REASONS = new Set(["expired", "inactive"]);

// GET is used for forced sign-outs (expired or deactivated); the sign-out button POSTs.
async function signOut(req: Request, reason: string) {
  await auth.signOut().catch((err: unknown) => console.error("signOut failed:", err));
  return NextResponse.redirect(new URL(`/login?reason=${reason}`, req.url), 303);
}

export async function GET(req: Request) {
  const reason = new URL(req.url).searchParams.get("reason") ?? "";
  return signOut(req, REASONS.has(reason) ? reason : "signedout");
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return new NextResponse(null, { status: 403 });
  return signOut(req, "signedout");
}
