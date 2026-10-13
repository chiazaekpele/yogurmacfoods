import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Daily Vercel Cron (TRD §12): deletes checkouts that were never paid, or whose
// order has long been created, once they pass expiresAt; and unpaid donations. The TRD puts this on the
// staff portal; it lives here until the portal is deployed. Vercel sends
// "Authorization: Bearer $CRON_SECRET" with every cron request.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { count } = await db.pendingCheckout.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  // Gifts started but never paid. Paid ones are kept forever (they feed the counter).
  const stale = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const donations = await db.donation.deleteMany({ where: { status: "PENDING", createdAt: { lt: stale } } });
  console.info(`[cron:cleanup] deleted ${count} expired pending checkouts, ${donations.count} unpaid donations`);
  return NextResponse.json({ deletedPendingCheckouts: count, deletedUnpaidDonations: donations.count });
}
