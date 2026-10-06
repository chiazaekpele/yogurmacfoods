import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toKobo } from "@/lib/money";
import { isSameOrigin } from "@/lib/origin";
import { initializeTransaction, isPaystackConfigured, isSimulatedPayments, upsertCustomer } from "@/lib/paystack";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fieldErrors, subscribeSchema } from "@/lib/validation";

export const runtime = "nodejs";

const UNAVAILABLE = "Payment is temporarily unavailable. Please try again in a few minutes.";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await rateLimit("subscribe", clientIp(req), { requests: 10, windowSeconds: 60 }))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  const { tierId, subscriberName, subscriberEmail } = parsed.data;

  const tier = await db.subscriptionTier.findFirst({ where: { id: tierId, isActive: true } });
  if (!tier) return NextResponse.json({ error: "That partnership tier is no longer available." }, { status: 422 });

  if (isSimulatedPayments()) {
    const params = new URLSearchParams({ tierId, name: subscriberName, email: subscriberEmail });
    return NextResponse.json({ mode: "simulated", payUrl: `/dev/pay/subscription?${params}` });
  }
  if (!isPaystackConfigured() || !tier.paystackPlanCode) {
    console.error(`Subscribe unavailable: Paystack key or plan code missing for tier ${tier.id}`);
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }

  try {
    await upsertCustomer(subscriberEmail, subscriberName);
    const tx = await initializeTransaction({
      email: subscriberEmail,
      amountKobo: toKobo(tier.monthlyAmount),
      plan: tier.paystackPlanCode,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/partner/thank-you`,
      metadata: { type: "subscription", tierId: tier.id, subscriberName },
    });
    return NextResponse.json({ mode: "paystack", accessCode: tx.access_code });
  } catch (err) {
    console.error("Paystack subscribe initialize failed:", err);
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}
