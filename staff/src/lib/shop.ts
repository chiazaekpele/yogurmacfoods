// Calls into the shop app, which is a separate deployment (TRD §10.1).
// Failures are logged but never fail the admin's save: the shop's time-based
// revalidation catches up within a minute (five for impact stats).

async function callShop(path: string, body: unknown): Promise<Response | null> {
  const base = process.env.SHOP_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) {
    console.warn(`[shop] SHOP_URL or REVALIDATE_SECRET not set; skipped ${path}`);
    return null;
  }
  try {
    return await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error(`[shop] ${path} failed:`, err);
    return null;
  }
}

export async function revalidateShop(paths: string[]): Promise<void> {
  const res = await callShop("/api/revalidate", { paths });
  if (res && !res.ok) console.error(`[shop] revalidate returned ${res.status}`);
}

// The confirmation email template lives in the shop; the shop sends it.
export async function resendOrderConfirmation(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await callShop("/api/internal/resend-confirmation", { orderId });
  if (!res) return { ok: false, error: "The shop could not be reached. Try again in a minute." };
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return res.ok ? { ok: true } : { ok: false, error: data.error ?? `The shop returned an error (${res.status}).` };
}

export const productPaths = (slug?: string) => ["/", "/products", ...(slug ? [`/products/${slug}`] : [])];
