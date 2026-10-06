import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

// Without Paystack keys, local development uses the simulated payment page.
// It is never available in production.
export function isSimulatedPayments(): boolean {
  return !isPaystackConfigured() && process.env.NODE_ENV !== "production";
}

export class PaystackError extends Error {}

async function paystack<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status || !json.data) {
    throw new PaystackError(json?.message ?? `Paystack ${path} failed with HTTP ${res.status}`);
  }
  return json.data;
}

type InitializeResult = { authorization_url: string; access_code: string; reference: string };

export function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference?: string;
  plan?: string;
  callbackUrl?: string;
  metadata: Record<string, unknown>;
}): Promise<InitializeResult> {
  return paystack<InitializeResult>("/transaction/initialize", {
    email: params.email,
    // With a plan, Paystack charges the plan's amount. We still send the same
    // amount, since the endpoint validates that the field is present.
    amount: params.amountKobo,
    ...(params.plan ? { plan: params.plan } : {}),
    ...(params.reference ? { reference: params.reference } : {}),
    currency: "NGN",
    channels: ["card", "bank_transfer"],
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  });
}

// Create or update the customer so subscription webhooks carry their name.
export async function upsertCustomer(email: string, fullName: string): Promise<void> {
  const [first_name, ...rest] = fullName.trim().split(/\s+/);
  await paystack("/customer", { email, first_name, last_name: rest.join(" ") || undefined });
}

export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAllowedWebhookIp(ip: string): boolean {
  const list = (process.env.PAYSTACK_WEBHOOK_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // An empty allowlist skips the IP layer; signature verification is the primary control.
  return list.length === 0 || list.includes(ip);
}
