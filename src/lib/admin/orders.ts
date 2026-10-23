import type { Fulfilment, OrderStatus } from "@/generated/prisma/client";
import { audit } from "./audit";
import { db } from "@/lib/db";

export { STATUS_LABELS, STATUS_ORDER } from "./order-status";

export class OrderActionError extends Error {}

// The admin does every step: CONFIRMED → IN_PRODUCTION → READY →
// OUT_FOR_DELIVERY → DELIVERED. Pickup orders skip OUT_FOR_DELIVERY (READY is
// "ready for pickup", DELIVERED "collected"). Stepping back one status to
// correct a mistake needs a reason.
const ADMIN_FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: "IN_PRODUCTION",
  IN_PRODUCTION: "READY",
  READY: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};
const BACK: Partial<Record<OrderStatus, OrderStatus>> = {
  IN_PRODUCTION: "CONFIRMED",
  READY: "IN_PRODUCTION",
  OUT_FOR_DELIVERY: "READY",
  DELIVERED: "OUT_FOR_DELIVERY",
};

const PICKUP_FORWARD: Partial<Record<OrderStatus, OrderStatus>> = { ...ADMIN_FORWARD, READY: "DELIVERED" };
const PICKUP_BACK: Partial<Record<OrderStatus, OrderStatus>> = { ...BACK, DELIVERED: "READY" };
const forwardMap = (f: Fulfilment) => (f === "PICKUP" ? PICKUP_FORWARD : ADMIN_FORWARD);
const backMap = (f: Fulfilment) => (f === "PICKUP" ? PICKUP_BACK : BACK);

export const nextAdminStatus = (s: OrderStatus, f: Fulfilment) => forwardMap(f)[s] ?? null;
export const previousStatus = (s: OrderStatus, f: Fulfilment) => backMap(f)[s] ?? null;

export async function adminMoveOrder(
  orderDbId: string,
  adminId: string,
  fulfilment: Fulfilment,
  from: OrderStatus,
  to: OrderStatus,
  reason?: string,
): Promise<void> {
  const forward = forwardMap(fulfilment)[from] === to;
  const back = backMap(fulfilment)[from] === to;
  if (!forward && !back) throw new OrderActionError("That status change is not allowed.");
  if (back && !reason?.trim()) throw new OrderActionError("Give a reason for moving the order back.");

  await db.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: orderDbId, status: from }, data: { status: to } });
    if (moved.count !== 1) throw new OrderActionError("The order changed while you were looking at it. Refresh and try again.");
    await audit(tx, {
      actorId: adminId,
      action: back ? "ORDER_STATUS_REVERTED" : "ORDER_STATUS_CHANGED",
      entityType: "Order",
      entityId: orderDbId,
      previousValue: { status: from },
      newValue: { status: to, ...(back ? { reason: reason!.trim() } : {}) },
    });
  });
}

// WhatsApp click-to-chat (PRD §6.2). Phones are stored as +234XXXXXXXXXX.
export function whatsappDeliveryLink(o: { customerName: string; customerPhone: string; orderId: string; exactAddress: string; landmark: string | null; lga: string; fulfilment: Fulfilment }) {
  const first = o.customerName.trim().split(/\s+/)[0];
  const text =
    o.fulfilment === "PICKUP"
      ? `Hi ${first}, this is Yogurmac Foods. Your order ${o.orderId} is ready to collect from ${o.exactAddress}. Thank you!`
      : `Hi ${first}, this is Yogurmac Foods. Your order ${o.orderId} is out for delivery to ${o.exactAddress}${o.landmark ? ` (near ${o.landmark})` : ""}, ${o.lga}. Our rider will call you on arrival. Thank you!`;
  return `https://wa.me/${o.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
