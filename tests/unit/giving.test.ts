import { describe, expect, it } from "vitest";
import { DONATION_REF_PATTERN, generateDonationRef, ORDER_ID_PATTERN } from "@/lib/order-id";
import { donateSchema, MAX_CHILDREN_PER_GIFT } from "@/lib/validation";

describe("donation references", () => {
  it("use the YMG prefix and never look like an order ID", () => {
    for (let i = 0; i < 200; i++) {
      const ref = generateDonationRef();
      expect(ref).toMatch(DONATION_REF_PATTERN);
      expect(ref).not.toMatch(ORDER_ID_PATTERN);
    }
  });
});

describe("donateSchema", () => {
  const ok = { children: 3, donorEmail: "Giver@Example.com" };

  it("accepts a gift and normalises the email; name is optional", () => {
    const r = donateSchema.parse({ ...ok, donorName: "  " });
    expect(r).toEqual({ children: 3, donorEmail: "giver@example.com", donorName: undefined });
  });

  it("needs a whole number of children within the limit", () => {
    expect(donateSchema.safeParse({ ...ok, children: 0 }).success).toBe(false);
    expect(donateSchema.safeParse({ ...ok, children: 1.5 }).success).toBe(false);
    expect(donateSchema.safeParse({ ...ok, children: MAX_CHILDREN_PER_GIFT + 1 }).success).toBe(false);
    expect(donateSchema.safeParse({ ...ok, children: MAX_CHILDREN_PER_GIFT }).success).toBe(true);
  });

  it("never accepts an amount from the browser", () => {
    expect(donateSchema.safeParse({ ...ok, amount: 1 }).success).toBe(false);
  });
});
