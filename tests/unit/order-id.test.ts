import { describe, expect, it } from "vitest";
import { lagosDateStamp } from "@/lib/lagos-time";
import { generateOrderId, ORDER_ID_PATTERN } from "@/lib/order-id";

describe("generateOrderId", () => {
  it("matches YMF-YYYYMMDD-XXXXX with an unambiguous alphabet", () => {
    for (let i = 0; i < 500; i++) {
      const id = generateOrderId();
      expect(id).toMatch(ORDER_ID_PATTERN);
      expect(id.slice(13)).not.toMatch(/[01OIL]/);
    }
  });
  it("uses the Lagos date, not UTC", () => {
    // 23:30 UTC on 5 Oct is 00:30 on 6 Oct in Lagos (UTC+1).
    const late = new Date("2026-10-05T23:30:00Z");
    expect(lagosDateStamp(late)).toBe("20261006");
    expect(generateOrderId(late).startsWith("YMF-20261006-")).toBe(true);
  });
});
