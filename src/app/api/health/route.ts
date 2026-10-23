import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "down" | "not_configured"> = {};
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "down";
  }
  if (!redis) checks.redis = "not_configured";
  else {
    try {
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "down";
    }
  }
  const healthy = !Object.values(checks).includes("down");
  // Which kind of Paystack key is set (never the key itself), so a deploy can
  // be checked for live payments.
  const key = process.env.PAYSTACK_SECRET_KEY ?? "";
  const paystack = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "not_configured";
  return NextResponse.json({ status: healthy ? "ok" : "degraded", checks, paystack }, { status: healthy ? 200 : 503 });
}
