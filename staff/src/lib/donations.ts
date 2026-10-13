import { db } from "./db";
import { lagosDate, lagosDayStart } from "./lagos-time";
import { fromKobo, toKobo } from "./money";

// One-time gifts at ₦500 per child (confirmed 10 Oct 2026). Only PAID
// (webhook-confirmed) donations count.

export type DonationTotals = { raised: string; children: number; gifts: number };

async function totalsSince(since?: Date): Promise<DonationTotals> {
  const agg = await db.donation.aggregate({
    where: { status: "PAID", ...(since ? { paidAt: { gte: since } } : {}) },
    _sum: { amount: true, children: true },
    _count: true,
  });
  return { raised: fromKobo(toKobo(agg._sum.amount ?? "0")), children: agg._sum.children ?? 0, gifts: agg._count };
}

export async function donationSummary() {
  const today = lagosDate();
  const monthStart = lagosDayStart(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  const yearStart = lagosDayStart(new Date(Date.UTC(today.getUTCFullYear(), 0, 1)));
  const [all, month, year] = await Promise.all([totalsSince(), totalsSince(monthStart), totalsSince(yearStart)]);
  return { all, month, year };
}
