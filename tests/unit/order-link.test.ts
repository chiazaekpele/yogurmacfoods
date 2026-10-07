import { describe, expect, it } from "vitest";
import { isValidOrderToken, orderPath, orderToken } from "@/lib/order-link";

describe("order links", () => {
  const id = "YMF-20261007-ABCDE";

  it("puts a token on the order path that validates for that order only", () => {
    const token = new URL(orderPath(id), "http://x").searchParams.get("t");
    expect(token).toBe(orderToken(id));
    expect(isValidOrderToken(id, token)).toBe(true);
    expect(isValidOrderToken("YMF-20261007-ABCDF", token)).toBe(false);
  });

  it("rejects missing, short or wrong tokens", () => {
    expect(isValidOrderToken(id, undefined)).toBe(false);
    expect(isValidOrderToken(id, ["a"])).toBe(false);
    expect(isValidOrderToken(id, orderToken(id)!.slice(0, 10))).toBe(false);
    expect(isValidOrderToken(id, "x".repeat(22))).toBe(false);
  });

  it("tolerates query junk appended after the token", () => {
    expect(isValidOrderToken(id, `${orderToken(id)}?trxref=abc`)).toBe(true);
  });
});
