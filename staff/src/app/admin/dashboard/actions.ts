"use server";

import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { backWith, str } from "@/lib/forms";
import { requireRole } from "@/lib/session";
import { resendOrderConfirmation } from "@/lib/shop";

const PATH = "/admin/dashboard";

export async function resendConfirmation(form: FormData) {
  const admin = await requireRole("ADMIN");
  const back = str(form, "back");
  const PATH = back.startsWith("/admin/") ? back : "/admin/dashboard";
  const order = await db.order.findUnique({ where: { id: str(form, "id") }, select: { id: true, orderId: true, emailSent: true } });
  if (!order) backWith(PATH, "error", "Order not found.");
  if (order.emailSent) backWith(PATH, "ok", `${order.orderId} has already been emailed.`);
  const result = await resendOrderConfirmation(order.orderId);
  if (!result.ok) backWith(PATH, "error", `Could not resend ${order.orderId}: ${result.error}`);
  await db.$transaction((tx) => audit(tx, { actorId: admin.id, action: "ORDER_EMAIL_RESENT", entityType: "Order", entityId: order.id }));
  backWith(PATH, "ok", `Confirmation email resent for ${order.orderId}.`);
}

export async function resolveAlert(form: FormData) {
  const admin = await requireRole("ADMIN");
  const id = str(form, "id");
  await db.$transaction(async (tx) => {
    const { count } = await tx.systemAlert.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: new Date() } });
    if (count) await audit(tx, { actorId: admin.id, action: "ALERT_RESOLVED", entityType: "SystemAlert", entityId: id });
  });
  backWith(PATH, "ok", "Alert marked as resolved.");
}
