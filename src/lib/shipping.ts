import { db } from "./db";
import { keyPrefix, redis } from "./redis";

const CACHE_KEY = `${keyPrefix}shipping:rates:v1`;

// lgaName -> fee in naira as a decimal string, or null when the admin has not set one.
export type ShippingRates = Record<string, string | null>;

export async function getShippingRates(): Promise<ShippingRates> {
  if (redis) {
    const cached = await redis.get<ShippingRates>(CACHE_KEY);
    if (cached) return cached;
  }
  const rows = await db.lGAShippingRate.findMany();
  const rates: ShippingRates = Object.fromEntries(
    rows.map((r) => [r.lgaName, r.shippingFee?.toString() ?? null]),
  );
  // clearShippingCache() runs whenever the admin changes a fee.
  if (redis) await redis.set(CACHE_KEY, rates);
  return rates;
}

export async function clearShippingCache(): Promise<void> {
  if (redis) await redis.del(CACHE_KEY).catch((err) => console.error("Shipping cache delete failed:", err));
}
