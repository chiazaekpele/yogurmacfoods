import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { KOBO_PER_CHILD } from "@/lib/giving";
import { fromKobo } from "@/lib/money";
import { generateDonationRef } from "@/lib/order-id";
import { isSameOrigin } from "@/lib/origin";
import { initializeTransaction, isPaystackConfigured, isSimulatedPayments } from "@/lib/paystack";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { donateSchema, fieldErrors } from "@/lib/validation";

export const runtime = "nodejs";

const UNAVAILABLE = "Payment is temporarily unavailable. Please try again in a few minutes.";

// One-time gift: ₦500 × children. The amount is computed here, never taken
// from the browser. The donation only counts once the webhook confirms it.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await rateLimit("donate", clientIp(req), { requests: 10, windowSeconds: 60 }))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }
  const parsed = donateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  const { children, donorName, donorEmail } = parsed.data;
  if (!isPaystackConfigured() && !isSimulatedPayments()) {
    console.error("Donation attempted without PAYSTACK_SECRET_KEY in production");
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }

  const amountKobo = children * KOBO_PER_CHILD;
  let donation;
  for (let attempt = 0; attempt < 5 && !donation; attempt++) {
    try {
      donation = await db.donation.create({
        data: { reference: generateDonationRef(), donorName: donorName ?? null, donorEmail, children, amount: fromKobo(amountKobo) },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }
  if (!donation) throw new Error("Could not allocate a donation reference");

  if (isSimulatedPayments()) {
    return NextResponse.json({ mode: "simulated", reference: donation.reference, payUrl: `/dev/pay/donation/${donation.reference}` });
  }
  try {
    const tx = await initializeTransaction({
      email: donorEmail,
      amountKobo,
      reference: donation.reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/partner/thank-you?ref=${donation.reference}`,
      metadata: { type: "donation", reference: donation.reference, children },
    });
    return NextResponse.json({ mode: "paystack", reference: donation.reference, accessCode: tx.access_code });
  } catch (err) {
    console.error("Paystack donation initialize failed:", err);
    await db.donation.delete({ where: { id: donation.id } });
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}
