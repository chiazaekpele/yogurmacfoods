import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { toKobo } from "@/lib/money";
import { isSimulatedPayments } from "@/lib/paystack";
import { handlePaystackEvent } from "@/lib/webhooks";

// LOCAL DEVELOPMENT ONLY. Stands in for Paystack when no keys are configured by
// producing the same events Paystack would send, and feeding them through the
// real webhook processor. Disabled whenever Paystack keys exist or in production.

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("order"), orderId: z.string() }),
  z.object({ type: z.literal("subscription"), tierId: z.string(), name: z.string().min(2), email: z.email() }),
]);

const fakeId = () => Math.floor(Math.random() * 1e9);
const code = (prefix: string) => `${prefix}_sim_${randomBytes(6).toString("hex")}`;

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
    return NextResponse.json({ ok: true, redirect: `/order/${pending.orderId}` });
  }

  const tier = await db.subscriptionTier.findFirst({ where: { id: body.tierId, isActive: true } });
  if (!tier) return NextResponse.json({ error: "Unknown tier" }, { status: 404 });
  // Simulated tiers have no real Paystack plan yet, so give them a local one.
  const planCode = tier.paystackPlanCode ?? `PLN_sim_${tier.id}`;
  if (!tier.paystackPlanCode) {
    await db.subscriptionTier.update({ where: { id: tier.id }, data: { paystackPlanCode: planCode } });
  }

  const [first_name, ...rest] = body.name.trim().split(/\s+/);
  const customer = { customer_code: code("CUS"), email: body.email, first_name, last_name: rest.join(" ") };
  const next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  // Paystack can send these in either order; send the charge first to exercise that path.
  await handlePaystackEvent({
    event: "charge.success",
    data: {
      id: fakeId(),
      reference: code("ref"),
      status: "success",
      currency: "NGN",
      amount: toKobo(tier.monthlyAmount),
      paid_at: new Date().toISOString(),
      customer,
      plan: { plan_code: planCode },
      metadata: { type: "subscription", tierId: tier.id },
    },
  });
  await handlePaystackEvent({
    event: "subscription.create",
    data: {
      id: fakeId(),
      subscription_code: code("SUB"),
      customer,
      plan: { plan_code: planCode },
      next_payment_date: next,
      createdAt: new Date().toISOString(),
    },
  });
  return NextResponse.json({ ok: true, redirect: `/partner/thank-you?tier=${encodeURIComponent(tier.name)}` });
}
