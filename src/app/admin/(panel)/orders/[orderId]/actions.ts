"use server";

import type { OrderStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { backWith, str } from "@/lib/admin/forms";
import { STATUS_ORDER } from "@/lib/admin/order-status";
import { adminMoveOrder, OrderActionError } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/admin/session";

const isStatus = (s: string): s is OrderStatus => (STATUS_ORDER as string[]).includes(s);

export async function moveOrder(form: FormData) {
  const admin = await requireAdmin();
  const orderId = str(form, "orderId");
  const from = str(form, "from");
  const to = str(form, "to");
  const path = `/admin/orders/${encodeURIComponent(orderId)}`;
  const order = await db.order.findUnique({ where: { orderId }, select: { id: true, fulfilment: true } });
  if (!order || !isStatus(from) || !isStatus(to)) backWith(path, "error", "That status change is not allowed.");
  try {
    await adminMoveOrder(order.id, admin.id, order.fulfilment, from, to, str(form, "reason").slice(0, 500));
  } catch (err) {
    if (err instanceof OrderActionError) backWith(path, "error", err.message);
    throw err;
  }
  backWith(path, "ok", "Order status updated.");
}
