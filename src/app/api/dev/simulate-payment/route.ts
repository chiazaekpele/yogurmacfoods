import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { toKobo } from "@/lib/money";
import { orderPath } from "@/lib/order-link";
import { isSimulatedPayments } from "@/lib/paystack";
import { handlePaystackEvent } from "@/lib/webhooks";

// LOCAL DEVELOPMENT ONLY. Stands in for Paystack when no keys are configured by
// producing the same events Paystack would send, and feeding them through the
// real webhook processor. Disabled whenever Paystack keys exist or in production.

const bodySchema = z.object({ type: z.literal("order"), orderId: z.string() });

const fakeId = () => Math.floor(Math.random() * 1e9);

export async function POST(req: Request) {
  if (!isSimulatedPayments()) return new NextResponse(null, { status: 404 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const body = parsed.data;

  const pending = await db.pendingCheckout.findUnique({ where: { orderId: body.orderId } });
  if (!pending) return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  await handlePaystackEvent({
    event: "charge.success",
    data: {
      id: fakeId(),
      reference: pending.orderId,
      status: "success",
      currency: "NGN",
      amount: toKobo(pending.total),
      paid_at: new Date().toISOString(),
      customer: { email: pending.customerEmail },
      metadata: { type: "order", orderId: pending.orderId },
    },
  });
  return NextResponse.json({ ok: true, redirect: orderPath(pending.orderId) });
}
