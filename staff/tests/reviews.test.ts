import { describe, expect, it } from "vitest";
import { addMonths, lagosDate } from "@/lib/lagos-time";
import { periodEndFor, periodsBetween, periodStartFor } from "@/lib/reviews";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date | null) => x?.toISOString().slice(0, 10) ?? null;

describe("lagosDate", () => {
  it("uses the Lagos calendar day, not UTC", () => {
    expect(iso(lagosDate(new Date("2026-10-05T23:30:00Z")))).toBe("2026-10-06");
    expect(iso(lagosDate(new Date("2026-10-05T22:59:00Z")))).toBe("2026-10-05");
  });
  it("clamps month ends", () => {
    expect(iso(addMonths(d("2026-01-31"), 1))).toBe("2026-02-28");
  });
});

describe("review periods", () => {
  const start = d("2026-10-01"); // a Thursday

  it("finds the period containing a day", () => {
    expect(iso(periodStartFor(start, "DAILY", d("2026-10-07")))).toBe("2026-10-07");
    expect(iso(periodStartFor(start, "WEEKLY", d("2026-10-07")))).toBe("2026-10-01");
    expect(iso(periodStartFor(start, "WEEKLY", d("2026-10-08")))).toBe("2026-10-08");
    expect(iso(periodStartFor(start, "BIWEEKLY", d("2026-10-20")))).toBe("2026-10-15");
    expect(iso(periodStartFor(start, "MONTHLY", d("2026-11-30")))).toBe("2026-11-01");
    expect(periodStartFor(start, "WEEKLY", d("2026-09-30"))).toBeNull();
  });

  it("monthly periods from the 31st clamp and keep stepping", () => {
    const s = d("2026-01-31");
    expect(iso(periodStartFor(s, "MONTHLY", d("2026-03-01")))).toBe("2026-02-28");
    expect(iso(periodStartFor(s, "MONTHLY", d("2026-03-31")))).toBe("2026-03-31");
  });

  it("ends the day before the next period", () => {
    expect(iso(periodEndFor(d("2026-10-01"), "WEEKLY"))).toBe("2026-10-07");
    expect(iso(periodEndFor(d("2026-10-01"), "MONTHLY"))).toBe("2026-10-31");
  });

  it("lists only completed periods, oldest first", () => {
    const got = periodsBetween(start, "WEEKLY", start, d("2026-10-22")).map(iso);
    expect(got).toEqual(["2026-10-01", "2026-10-08", "2026-10-15"]);
  });

  it("skips a period that started before someone joined", () => {
    const got = periodsBetween(start, "WEEKLY", d("2026-10-03"), d("2026-10-22")).map(iso);
    expect(got).toEqual(["2026-10-08", "2026-10-15"]);
  });
});
