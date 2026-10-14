import { describe, expect, it } from "vitest";
import { normaliseNigerianMobile } from "@/lib/phone";
import { checkoutSchema } from "@/lib/validation";

describe("normaliseNigerianMobile", () => {
  it("accepts local, 234 and +234 forms", () => {
    expect(normaliseNigerianMobile("08031234567")).toBe("+2348031234567");
    expect(normaliseNigerianMobile("0803 123 4567")).toBe("+2348031234567");
    expect(normaliseNigerianMobile("2349061234567")).toBe("+2349061234567");
    expect(normaliseNigerianMobile("+2347011234567")).toBe("+2347011234567");
  });
  it("rejects landlines and malformed numbers", () => {
    expect(normaliseNigerianMobile("0123456789")).toBeNull();
    expect(normaliseNigerianMobile("0803123456")).toBeNull();
    expect(normaliseNigerianMobile("08531234567")).toBeNull();
  });
});

const valid = {
  customerName: "Ada Obi",
  customerEmail: "ADA@Example.com ",
  customerPhone: "0803 123 4567",
  lga: "Ikeja",
  exactAddress: "12 Allen Avenue",
  landmark: "",
  items: [{ variantId: "v1", quantity: 2 }],
  expectedTotalKobo: 100000,
  acceptTerms: true,
};

describe("checkoutSchema", () => {
  it("normalises valid input", () => {
    const r = checkoutSchema.parse(valid);
    expect(r.customerEmail).toBe("ada@example.com");
    expect(r.customerPhone).toBe("+2348031234567");
    expect(r.landmark).toBeUndefined();
  });
  it("rejects unknown LGAs, unknown keys and client-supplied prices", () => {
    expect(checkoutSchema.safeParse({ ...valid, lga: "Abuja" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, total: 5 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, items: [{ variantId: "v1", quantity: 1, unitPrice: "1" }] }).success).toBe(false);
  });
  it("requires agreeing to the terms", () => {
    expect(checkoutSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
    const { acceptTerms: _, ...withoutTerms } = valid;
    expect(checkoutSchema.safeParse(withoutTerms).success).toBe(false);
  });
  it("bounds quantities", () => {
    expect(checkoutSchema.safeParse({ ...valid, items: [{ variantId: "v1", quantity: 0 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, items: [{ variantId: "v1", quantity: 100 }] }).success).toBe(false);
  });
});
