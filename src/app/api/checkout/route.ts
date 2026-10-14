import { NextResponse } from "next/server";
import { CheckoutError, createPendingCheckout, quote } from "@/lib/checkout";
import { getCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { fromKobo } from "@/lib/money";
import { orderPath } from "@/lib/order-link";
import { isSameOrigin } from "@/lib/origin";
import { initializeTransaction, isPaystackConfigured, isSimulatedPayments } from "@/lib/paystack";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

const UNAVAILABLE = "Payment is temporarily unavailable. Please try again in a few minutes.";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await rateLimit("checkout", clientIp(req), { requests: 10, windowSeconds: 60 }))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  // Paying requires an account (13 Oct 2026).
  const customer = await getCustomer();
  if (!customer) return NextResponse.json({ error: "Please sign in to place your order.", signIn: true }, { status: 401 });

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  let q;
  try {
    q = await quote(input);
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message, fields: err.field ? { [err.field]: err.message } : undefined }, { status: err.status });
    }
    throw err;
  }

  // The admin changed a price since the cart was filled: show the new total first.
  if (q.totalKobo !== input.expectedTotalKobo) {
    return NextResponse.json(
      {
        error: "Some prices have changed since you added items to your cart. Please review the new total.",
        priceChanged: true,
        lines: q.lines,
        subtotal: fromKobo(q.subtotalKobo),
        shippingFee: fromKobo(q.shippingKobo),
        total: fromKobo(q.totalKobo),
      },
      { status: 409 },
    );
  }

  if (!isPaystackConfigured() && !isSimulatedPayments()) {
    console.error("Checkout attempted without PAYSTACK_SECRET_KEY in production");
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }

  const pending = await createPendingCheckout(input, q, customer.id);
  // Remember these details for next time.
  await db.customer.update({
    where: { id: customer.id },
    data: { name: input.customerName, phone: input.customerPhone, lga: input.lga, exactAddress: input.exactAddress, landmark: input.landmark ?? null },
  });

  if (isSimulatedPayments()) {
    return NextResponse.json({ mode: "simulated", orderId: pending.orderId, payUrl: `/dev/pay/${pending.orderId}` });
  }

  try {
    const tx = await initializeTransaction({
      email: input.customerEmail,
      amountKobo: q.totalKobo,
      reference: pending.orderId,
      callbackUrl: `${siteUrl()}${orderPath(pending.orderId)}`,
      metadata: { type: "order", orderId: pending.orderId },
    });
    await db.pendingCheckout.update({ where: { id: pending.id }, data: { accessCode: tx.access_code } });
    return NextResponse.json({ mode: "paystack", orderUrl: orderPath(pending.orderId), accessCode: tx.access_code });
  } catch (err) {
    console.error("Paystack initialize failed:", err);
    await db.pendingCheckout.delete({ where: { id: pending.id } });
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}
