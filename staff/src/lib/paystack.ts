import { toKobo } from "./money";

// Plan creation only (PRD §6.6). The shop owns payments and webhooks.
export class PaystackError extends Error {}

export async function createMonthlyPlan(name: string, monthlyAmount: string): Promise<string> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new PaystackError("Paystack is not configured.");
    return `PLN_local_${Date.now()}`; // local development without Paystack keys
  }
  const res = await fetch("https://api.paystack.co/plan", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, amount: toKobo(monthlyAmount), interval: "monthly", currency: "NGN" }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as { status?: boolean; message?: string; data?: { plan_code?: string } } | null;
  if (!res?.ok || !json?.status || !json.data?.plan_code) {
    throw new PaystackError(json?.message ?? "Paystack could not be reached. Please try again.");
  }
  return json.data.plan_code;
}
