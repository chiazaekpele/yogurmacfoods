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
  return NextResponse.json({ status: healthy ? "ok" : "degraded", checks }, { status: healthy ? 200 : 503 });
}
