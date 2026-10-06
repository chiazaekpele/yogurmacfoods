import { NextResponse } from "next/server";
import { isAllowedWebhookIp, verifyPaystackSignature } from "@/lib/paystack";
import { clientIp } from "@/lib/rate-limit";
import { handlePaystackEvent, type PaystackEvent } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exempt from the Origin check: this is server-to-server and is protected by
// the HMAC signature (primary) and the Paystack IP allowlist (secondary).
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new NextResponse(null, { status: 503 });

  const raw = await req.text();
  if (!isAllowedWebhookIp(clientIp(req)) || !verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"), secret)) {
    console.warn("Rejected Paystack webhook: bad signature or source IP");
    return new NextResponse(null, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await handlePaystackEvent(event);
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    // A 500 makes Paystack retry; processing is idempotent.
    console.error("Paystack webhook processing failed:", err);
    return new NextResponse(null, { status: 500 });
  }
}
