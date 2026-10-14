import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ORDER_ID_PATTERN } from "@/lib/order-id";
import { confirmFromPaystack } from "@/lib/webhooks";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/order-status/[orderId]">) {
  const { orderId } = await ctx.params;
  if (!(await rateLimit("order-status", clientIp(req), { requests: 60, windowSeconds: 60 }))) {
    return NextResponse.json({ state: "rate_limited" }, { status: 429 });
  }
  if (!ORDER_ID_PATTERN.test(orderId)) return NextResponse.json({ state: "not_found" }, { status: 404 });

  const order = await db.order.findUnique({ where: { orderId }, select: { id: true } });
  if (order) return NextResponse.json({ state: "confirmed" });
  const pending = await db.pendingCheckout.findUnique({ where: { orderId }, select: { id: true } });
  if (pending) return NextResponse.json({ state: (await confirmFromPaystack(orderId)) ? "confirmed" : "pending" });
  return NextResponse.json({ state: "not_found" }, { status: 404 });
}
