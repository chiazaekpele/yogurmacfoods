import { db } from "@/lib/db";
import { lagosDate, lagosDayStart } from "@/lib/lagos-time";

// Wellness boxes sold (13 Oct 2026): the same figure as the shop's live counter.
// 25% of profits fund Ythirst; the site can't see profit, so it counts boxes.
// Each day of a daily box counts as one box.

async function boxesSince(since?: Date): Promise<number> {
  const [row] = since
    ? await db.$queryRaw<{ boxes: bigint | null }[]>`
        SELECT sum(i.quantity * i.days) AS boxes FROM "OrderItem" i
        JOIN "Order" o ON o.id = i."orderId"
        JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId"
        WHERE p.category = 'WELLNESS_BOX' AND o."createdAt" >= ${since}`
    : await db.$queryRaw<{ boxes: bigint | null }[]>`
        SELECT sum(i.quantity * i.days) AS boxes FROM "OrderItem" i
        JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId"
        WHERE p.category = 'WELLNESS_BOX'`;
  return Number(row?.boxes ?? 0);
}

export async function boxSummary() {
  const today = lagosDate();
  const monthStart = lagosDayStart(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  const yearStart = lagosDayStart(new Date(Date.UTC(today.getUTCFullYear(), 0, 1)));
  const [all, month, year] = await Promise.all([boxesSince(), boxesSince(monthStart), boxesSince(yearStart)]);
  return { all, month, year };
}
