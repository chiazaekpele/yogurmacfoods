import { describe, expect, it } from "vitest";
import { formatNaira, fromKobo, toKobo, vatKobo } from "@/lib/money";

describe("toKobo / fromKobo", () => {
  it("converts decimal strings exactly", () => {
    expect(toKobo("2500.00")).toBe(250000);
    expect(toKobo("0.1")).toBe(10);
    expect(toKobo("19.99")).toBe(1999);
    expect(toKobo(2500)).toBe(250000);
    expect(toKobo({ toString: () => "8950.00" })).toBe(895000);
  });
  it("round-trips", () => {
    for (const k of [0, 1, 99, 100, 250000, 123456789]) expect(toKobo(fromKobo(k))).toBe(k);
  });
  it("rejects garbage and non-integer kobo", () => {
    expect(() => toKobo("abc")).toThrow();
    expect(() => fromKobo(1.5)).toThrow();
  });
});

describe("formatNaira", () => {
  it("formats whole and fractional amounts", () => {
    expect(formatNaira("2500.00")).toBe("₦2,500");
    expect(formatNaira("1999.50")).toBe("₦1,999.50");
  });
});

describe("vatKobo", () => {
  it("adds VAT at the rate, rounded to the nearest kobo", () => {
    expect(vatKobo(1_320_000, 7.5)).toBe(99_000); // ₦13,200 → ₦990
    expect(vatKobo(333, 7.5)).toBe(25); // 24.975 kobo rounds up
    expect(vatKobo(1_000_000, 0)).toBe(0);
  });
});
