import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, lagosDate } from "@/lib/lagos-time";
import { periodsBetween, periodStartFor } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 62;

// Daily Vercel Cron (TRD §12), shortly after midnight Lagos: every finished
// review period a staff member didn't answer is recorded as missed.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const today = lagosDate();
  const floor = addDays(today, -LOOKBACK_DAYS);
  const [cycles, staff] = await Promise.all([
    db.reviewCycle.findMany({
      where: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gt: floor } }], questions: { some: {} } },
    }),
    db.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true, createdAt: true } }),
  ]);

  const rows: { cycleId: string; staffId: string; periodStart: Date; isMissed: true }[] = [];
  for (const c of cycles) {
    // Periods that ended before today (and before the cycle was replaced).
    const current = periodStartFor(c.startDate, c.cadence, today)!;
    const end = c.endDate && lagosDate(c.endDate) < current ? lagosDate(c.endDate) : current;
    for (const s of staff) {
      const joined = lagosDate(s.createdAt);
      const from = [c.startDate, joined, floor].reduce((a, b) => (a > b ? a : b));
      for (const periodStart of periodsBetween(c.startDate, c.cadence, from, end)) {
        rows.push({ cycleId: c.id, staffId: s.id, periodStart, isMissed: true });
      }
    }
  }
  // The unique (staffId, cycleId, periodStart) index skips periods already answered or recorded.
  const { count } = rows.length ? await db.reviewSubmission.createMany({ data: rows, skipDuplicates: true }) : { count: 0 };
  console.info(`[cron:missed-reviews] recorded ${count} missed check-ins`);
  return NextResponse.json({ missed: count });
}
