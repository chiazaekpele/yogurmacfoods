import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPaystackSignature } from "@/lib/paystack";
import { dedupeKey } from "@/lib/webhooks";

const secret = "sk_test_example";
const body = JSON.stringify({ event: "charge.success", data: { id: 1, reference: "YMF-20261006-ABCDE" } });
const sign = (b: string, s: string) => createHmac("sha512", s).update(b).digest("hex");

describe("verifyPaystackSignature", () => {
  it("accepts a valid signature", () => expect(verifyPaystackSignature(body, sign(body, secret), secret)).toBe(true));
  it("rejects a tampered body", () => expect(verifyPaystackSignature(body.replace("1", "2"), sign(body, secret), secret)).toBe(false));
  it("rejects the wrong key", () => expect(verifyPaystackSignature(body, sign(body, "sk_other"), secret)).toBe(false));
  it("rejects a missing header", () => expect(verifyPaystackSignature(body, null, secret)).toBe(false));
});

describe("dedupeKey", () => {
  it("prefers the event id, then the reference", () => {
    expect(dedupeKey({ event: "charge.success", data: { id: 7, reference: "r" } })).toBe("charge.success:7");
    expect(dedupeKey({ event: "x", data: { reference: "r" } })).toBe("x:r");
  });
});
