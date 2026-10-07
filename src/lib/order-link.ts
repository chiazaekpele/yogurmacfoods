import { createHmac, timingSafeEqual } from "node:crypto";

// The order page shows the delivery address, so a bare Order ID is not enough to
// see it (TRD §21 item 2). Links we hand the customer (Paystack redirect, the
// confirmation email) carry an HMAC of the Order ID; without it the page still
// confirms the order but leaves out the address.

function secret(): string | null {
  return process.env.ORDER_LINK_SECRET || (process.env.NODE_ENV === "production" ? null : "local-dev-order-link");
}

export function orderToken(orderId: string): string | null {
  const key = secret();
  return key ? createHmac("sha256", key).update(orderId).digest("base64url").slice(0, 22) : null;
}

export function orderPath(orderId: string): string {
  const token = orderToken(orderId);
  return token ? `/order/${orderId}?t=${token}` : `/order/${orderId}`;
}

export function isValidOrderToken(orderId: string, token: unknown): boolean {
  const expected = orderToken(orderId);
  if (!expected || typeof token !== "string") return false;
  // A redirect that appends its own "?ref=..." can leave junk after the token.
  const given = token.slice(0, expected.length);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
