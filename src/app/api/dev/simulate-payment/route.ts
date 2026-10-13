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

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("order"), orderId: z.string() }),
  z.object({ type: z.literal("donation"), reference: z.string() }),
]);

const fakeId = () => Math.floor(Math.random() * 1e9);

export async function POST(req: Request) {
  if (!isSimulatedPayments()) return new NextResponse(null, { status: 404 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const body = parsed.data;

  if (body.type === "order") {
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

  const donation = await db.donation.findUnique({ where: { reference: body.reference } });
  if (!donation) return NextResponse.json({ error: "Unknown donation" }, { status: 404 });
  await handlePaystackEvent({
    event: "charge.success",
    data: {
      id: fakeId(),
      reference: donation.reference,
      status: "success",
      currency: "NGN",
      amount: toKobo(donation.amount),
      paid_at: new Date().toISOString(),
      customer: { email: donation.donorEmail },
      metadata: { type: "donation", reference: donation.reference, children: donation.children },
    },
  });
  return NextResponse.json({ ok: true, redirect: `/partner/thank-you?ref=${donation.reference}` });
}
