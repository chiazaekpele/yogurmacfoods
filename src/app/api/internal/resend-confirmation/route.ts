import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ORDER_ID_PATTERN } from "@/lib/order-id";
import { sendOrderEmail } from "@/lib/webhooks";

export const runtime = "nodejs";

// Called by the staff portal (server to server) when the admin resends a
// failed confirmation email. Protected by the shared REVALIDATE_SECRET.
const bodySchema = z.strictObject({ orderId: z.string().regex(ORDER_ID_PATTERN) });

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const order = await db.order.findUnique({ where: { orderId: parsed.data.orderId }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const result = await sendOrderEmail(order.id);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 502 });
}
