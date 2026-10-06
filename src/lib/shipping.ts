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
  // The staff portal deletes this key whenever a fee changes.
  if (redis) await redis.set(CACHE_KEY, rates);
  return rates;
}
