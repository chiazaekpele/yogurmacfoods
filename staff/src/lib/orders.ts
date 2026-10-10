import { Prisma, type OrderStatus } from "@/generated/prisma/client";
import { audit } from "./audit";
import { db } from "./db";

export { STATUS_LABELS, STATUS_ORDER } from "./order-status";

export class OrderActionError extends Error {}

const MSG_HAS_ACTIVE = "Mark your current order as Ready before claiming another.";
const MSG_TAKEN = "That order was just claimed by someone else.";

// TRD §9.6. The conditional update is the race guard: of two simultaneous
// claims only one sees count === 1. The partial unique index enforces one
// active order per staff member even if this code were wrong.
export async function claimOrder(orderDbId: string, staffId: string): Promise<void> {
  const active = await db.orderClaim.findFirst({ where: { staffId, markedReadyAt: null }, select: { id: true } });
  if (active) throw new OrderActionError(MSG_HAS_ACTIVE);
  try {
    await db.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({ where: { id: orderDbId, status: "CONFIRMED" }, data: { status: "IN_PRODUCTION" } });
      if (moved.count !== 1) throw new OrderActionError(MSG_TAKEN);
      await tx.orderClaim.create({ data: { orderId: orderDbId, staffId } });
      await audit(tx, {
        actorId: staffId,
        action: "ORDER_STATUS_CHANGED",
        entityType: "Order",
        entityId: orderDbId,
        previousValue: { status: "CONFIRMED" },
        newValue: { status: "IN_PRODUCTION", via: "claim" },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = JSON.stringify(err.meta ?? {});
      throw new OrderActionError(target.includes("orderId") ? MSG_TAKEN : MSG_HAS_ACTIVE);
    }
    throw err;
  }
}

export async function markReady(orderDbId: string, staffId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const claim = await tx.orderClaim.findFirst({ where: { orderId: orderDbId, staffId, markedReadyAt: null } });
    if (!claim) throw new OrderActionError("This order is not in production with you.");
    const moved = await tx.order.updateMany({ where: { id: orderDbId, status: "IN_PRODUCTION" }, data: { status: "READY" } });
    if (moved.count !== 1) throw new OrderActionError("This order has already moved on.");
    await tx.orderClaim.update({ where: { id: claim.id }, data: { markedReadyAt: new Date() } });
    await audit(tx, {
      actorId: staffId,
      action: "ORDER_STATUS_CHANGED",
      entityType: "Order",
      entityId: orderDbId,
      previousValue: { status: "IN_PRODUCTION" },
      newValue: { status: "READY" },
    });
  });
}

// Admin moves (TRD §9.5): forward READY → OUT_FOR_DELIVERY → DELIVERED.
// Stepping back one status to correct a mistake needs a reason (TRD §21 item 8).
const ADMIN_FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  READY: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};
const BACK: Partial<Record<OrderStatus, OrderStatus>> = {
  IN_PRODUCTION: "CONFIRMED",
  READY: "IN_PRODUCTION",
  OUT_FOR_DELIVERY: "READY",
  DELIVERED: "OUT_FOR_DELIVERY",
};

export const nextAdminStatus = (s: OrderStatus) => ADMIN_FORWARD[s] ?? null;
export const previousStatus = (s: OrderStatus) => BACK[s] ?? null;

export async function adminMoveOrder(
  orderDbId: string,
  adminId: string,
  from: OrderStatus,
  to: OrderStatus,
  reason?: string,
): Promise<void> {
  const forward = ADMIN_FORWARD[from] === to;
  const back = BACK[from] === to;
  if (!forward && !back) throw new OrderActionError("That status change is not allowed.");
  if (back && !reason?.trim()) throw new OrderActionError("Give a reason for moving the order back.");

  try {
    await db.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({ where: { id: orderDbId, status: from }, data: { status: to } });
      if (moved.count !== 1) throw new OrderActionError("The order changed while you were looking at it. Refresh and try again.");
      // Keep the production claim consistent with the status.
      if (from === "IN_PRODUCTION" && to === "CONFIRMED") await tx.orderClaim.deleteMany({ where: { orderId: orderDbId } });
      if (from === "READY" && to === "IN_PRODUCTION") await tx.orderClaim.updateMany({ where: { orderId: orderDbId }, data: { markedReadyAt: null } });
      await audit(tx, {
        actorId: adminId,
        action: back ? "ORDER_STATUS_REVERTED" : "ORDER_STATUS_CHANGED",
        entityType: "Order",
        entityId: orderDbId,
        previousValue: { status: from },
        newValue: { status: to, ...(back ? { reason: reason!.trim() } : {}) },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new OrderActionError("The staff member who made this order is already working on another one.");
    }
    throw err;
  }
}

// WhatsApp click-to-chat (PRD §6.2). Phones are stored as +234XXXXXXXXXX.
export function whatsappDeliveryLink(o: { customerName: string; customerPhone: string; orderId: string; exactAddress: string; landmark: string | null; lga: string }) {
  const first = o.customerName.trim().split(/\s+/)[0];
  const address = `${o.exactAddress}${o.landmark ? ` (near ${o.landmark})` : ""}, ${o.lga}`;
  const text = `Hi ${first}, this is Yogurmac Foods. Your order ${o.orderId} is out for delivery to ${address}. Our rider will call you on arrival. Thank you!`;
  return `https://wa.me/${o.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
