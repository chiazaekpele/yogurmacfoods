import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

// Proxies the browser's auth calls to Neon Auth. Staff cannot self-register
// (PRD §4.2): accounts are only created through the invite page, which calls
// Neon Auth from the server, so public sign-up through this route is refused.
const handlers = auth.handler();

export const GET = handlers.GET;

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path[0] === "sign-up") return NextResponse.json({ error: "Sign-up is by invitation only." }, { status: 403 });
  return handlers.POST(req, ctx);
}
