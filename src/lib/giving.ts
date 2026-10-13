import { db } from "./db";
import { fromKobo, toKobo } from "./money";

// Confirmed 10 Oct 2026: every ₦500 given supports one child.
export const NAIRA_PER_CHILD = 500;
export const KOBO_PER_CHILD = NAIRA_PER_CHILD * 100;

export type GivingTotals = { raised: string; children: number; gifts: number };

// The live counter: confirmed (webhook-verified) donations only.
export async function getGivingTotals(): Promise<GivingTotals> {
  const agg = await db.donation.aggregate({ where: { status: "PAID" }, _sum: { amount: true, children: true }, _count: true });
  return { raised: fromKobo(toKobo(agg._sum.amount ?? "0")), children: agg._sum.children ?? 0, gifts: agg._count };
}
