import { db } from "./db";

// Staff only see what to make (PRD §7.2, TRD §9.4). These selects are the only
// way staff pages read orders; they never include customer details.
export const STAFF_ORDER_SELECT = {
  id: true,
  orderId: true,
  status: true,
  createdAt: true,
  items: { select: { id: true, productName: true, flavour: true, size: true, quantity: true, days: true } },
} as const;

export const CUSTOMER_FIELDS = ["customerName", "customerEmail", "customerPhone", "exactAddress", "landmark", "lga"] as const;

export function listQueue() {
  return db.order.findMany({ where: { status: "CONFIRMED" }, orderBy: { createdAt: "asc" }, select: STAFF_ORDER_SELECT });
}

export function activeClaim(staffId: string) {
  return db.orderClaim.findFirst({
    where: { staffId, markedReadyAt: null },
    select: { claimedAt: true, order: { select: STAFF_ORDER_SELECT } },
  });
}

// A queue order, or one this staff member is producing; anything else is a 404.
export async function orderForStaff(orderId: string, staffId: string) {
  const order = await db.order.findUnique({
    where: { orderId },
    select: { ...STAFF_ORDER_SELECT, claim: { select: { staffId: true, markedReadyAt: true } }, setbacks: { where: { staffId }, select: { id: true, category: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!order) return null;
  const mine = order.claim?.staffId === staffId && !order.claim.markedReadyAt && order.status === "IN_PRODUCTION";
  if (order.status !== "CONFIRMED" && !mine) return null;
  return { ...order, mine };
}
