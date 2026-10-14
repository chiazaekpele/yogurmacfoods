import { db } from "@/lib/db";
import { addDays, isoDay, lagosDate, lagosDayStart } from "@/lib/lagos-time";
import { toKobo } from "@/lib/money";

// Revenue is reported two ways (TRD §21 item 10): product revenue (subtotal,
// excluding delivery) and total collected (including delivery).

export type Range = { key: string; label: string; from: Date; to: Date }; // Lagos days, `to` inclusive

export function resolveRange(key: string | undefined, fromParam?: string, toParam?: string): Range {
  const today = lagosDate();
  const day = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);
  switch (key) {
    case "30d":
      return { key, label: "Last 30 days", from: addDays(today, -29), to: today };
    case "90d":
      return { key, label: "Last 3 months", from: addDays(today, -89), to: today };
    case "year":
      return { key, label: "This year", from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), to: today };
    case "custom": {
      const f = day(fromParam);
      const t = day(toParam);
      if (f && t && f <= t && t.getTime() - f.getTime() <= 366 * 86_400_000) return { key, label: `${isoDay(f)} to ${isoDay(t)}`, from: f, to: t };
      break;
    }
  }
  return { key: "7d", label: "Last 7 days", from: addDays(today, -6), to: today };
}

const bounds = (r: { from: Date; to: Date }) => ({ gte: lagosDayStart(r.from), lt: lagosDayStart(addDays(r.to, 1)) });

export async function revenueSummary() {
  const today = lagosDate();
  const weekday = (today.getUTCDay() + 6) % 7; // Monday = 0
  const periods = {
    today: { from: today, to: today },
    week: { from: addDays(today, -weekday), to: today },
    month: { from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), to: today },
    year: { from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), to: today },
  };
  const entries = await Promise.all(
    Object.entries(periods).map(async ([k, p]) => {
      const agg = await db.order.aggregate({ where: { createdAt: bounds(p) }, _sum: { subtotal: true, total: true }, _count: true });
      return [k, { orders: agg._count, productKobo: toKobo(agg._sum.subtotal ?? "0"), totalKobo: toKobo(agg._sum.total ?? "0") }] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<keyof typeof periods, { orders: number; productKobo: number; totalKobo: number }>;
}

export async function dailySeries(range: Range) {
  // Day returned as text: the pg driver would turn a date into local midnight.
  const rows = await db.$queryRaw<{ day: string; orders: bigint; subtotal: string; total: string }[]>`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS day,
           count(*) AS orders, sum(subtotal)::text AS subtotal, sum(total)::text AS total
    FROM "Order"
    WHERE "createdAt" >= ${lagosDayStart(range.from)} AND "createdAt" < ${lagosDayStart(addDays(range.to, 1))}
    GROUP BY 1 ORDER BY 1`;
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: { day: string; orders: number; productKobo: number; totalKobo: number }[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const r = byDay.get(isoDay(d));
    out.push({ day: isoDay(d), orders: r ? Number(r.orders) : 0, productKobo: r ? toKobo(r.subtotal) : 0, totalKobo: r ? toKobo(r.total) : 0 });
  }
  return out;
}

export async function periodBreakdowns(range: Range) {
  const where = { createdAt: bounds(range) };
  const [byStatus, byLga, products, variants] = await Promise.all([
    db.order.groupBy({ by: ["status"], where, _count: true }),
    db.order.groupBy({ by: ["lga"], where, _count: true, _sum: { total: true }, orderBy: { _count: { lga: "desc" } } }),
    db.$queryRaw<{ name: string; units: bigint; revenue: string }[]>`
      SELECT i."productName" AS name, sum(i.quantity * i.days) AS units, sum(i.quantity * i.days * i."unitPrice")::text AS revenue
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
      WHERE o."createdAt" >= ${where.createdAt.gte} AND o."createdAt" < ${where.createdAt.lt}
      GROUP BY 1`,
    db.$queryRaw<{ name: string; flavour: string; size: string; units: bigint }[]>`
      SELECT i."productName" AS name, i.flavour, i.size, sum(i.quantity * i.days) AS units
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
      WHERE o."createdAt" >= ${where.createdAt.gte} AND o."createdAt" < ${where.createdAt.lt}
      GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 10`,
  ]);
  return {
    byStatus,
    byLga,
    productsByUnits: [...products].sort((a, b) => Number(b.units - a.units)).slice(0, 10),
    productsByRevenue: [...products].sort((a, b) => toKobo(b.revenue) - toKobo(a.revenue)).slice(0, 10),
    variants,
  };
}
