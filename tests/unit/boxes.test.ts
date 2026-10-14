import { describe, expect, it } from "vitest";
import { cartItemSchema, MAX_DAYS } from "@/lib/validation";

describe("cart items: days (wellness boxes)", () => {
  it("defaults to one day", () => {
    expect(cartItemSchema.parse({ variantId: "v1", quantity: 2 })).toEqual({ variantId: "v1", quantity: 2, days: 1 });
  });
  it("accepts any whole number of days up to the limit", () => {
    expect(cartItemSchema.parse({ variantId: "v1", quantity: 1, days: 30 }).days).toBe(30);
    expect(cartItemSchema.safeParse({ variantId: "v1", quantity: 1, days: MAX_DAYS }).success).toBe(true);
  });
  it("rejects zero, fractions and too many days", () => {
    for (const days of [0, 1.5, MAX_DAYS + 1]) expect(cartItemSchema.safeParse({ variantId: "v1", quantity: 1, days }).success).toBe(false);
  });
});
