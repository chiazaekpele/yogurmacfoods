import { NextResponse } from "next/server";
import { getGivingTotals } from "@/lib/giving";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Polled by the live counter every few seconds.
export async function GET(req: Request) {
  if (!(await rateLimit("giving", clientIp(req), { requests: 60, windowSeconds: 60 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return NextResponse.json(await getGivingTotals(), { headers: { "Cache-Control": "no-store" } });
}
