import { db } from "./db";

// Ythirst is funded by 25% of Yogurmac's profits (13 Oct 2026). The site can't
// see profit, so the live counter shows wellness boxes sold instead: each day
// of a daily box counts as one box. Orders only exist once paid.
export type BoxTotals = { boxes: number };

// Every open page polls this, so the total is kept for a few seconds rather
// than summed on every request (per server instance).
const TTL_MS = 15_000;
let cached: { at: number; value: BoxTotals } | null = null;

export async function getBoxTotals(): Promise<BoxTotals> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const [row] = await db.$queryRaw<{ boxes: bigint | null }[]>`
    SELECT sum(i.quantity * i.days) AS boxes
    FROM "OrderItem" i
    JOIN "ProductVariant" v ON v.id = i."variantId"
    JOIN "Product" p ON p.id = v."productId"
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE c."isBox"`;
  const value = { boxes: Number(row?.boxes ?? 0) };
  cached = { at: Date.now(), value };
  return value;
}
