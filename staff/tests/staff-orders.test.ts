import { describe, expect, it } from "vitest";
import { CUSTOMER_FIELDS, STAFF_ORDER_SELECT } from "@/lib/staff-orders";

// TRD §9.4: no staff path may select customer personal details.
describe("staff order select", () => {
  it("never selects customer details", () => {
    const keys = JSON.stringify(STAFF_ORDER_SELECT);
    for (const field of CUSTOMER_FIELDS) expect(keys).not.toContain(`"${field}"`);
  });
});
