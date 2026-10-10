"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { backWith, firstError, requiredText, str } from "@/lib/forms";
import { claimOrder, markReady, OrderActionError } from "@/lib/orders";
import { requireRole } from "@/lib/session";

export async function claim(form: FormData) {
  const staff = await requireRole("STAFF");
  const orderId = str(form, "orderId");
  const order = await db.order.findUnique({ where: { orderId }, select: { id: true } });
  if (!order) backWith("/staff/queue", "error", "That order no longer exists.");
  try {
    await claimOrder(order.id, staff.id);
  } catch (err) {
    if (err instanceof OrderActionError) backWith("/staff/queue", "error", err.message);
    throw err;
  }
  backWith(`/staff/queue/${orderId}`, "ok", "Order claimed. It’s yours to make.");
}

export async function ready(form: FormData) {
  const staff = await requireRole("STAFF");
  const orderId = str(form, "orderId");
  const order = await db.order.findUnique({ where: { orderId }, select: { id: true } });
  if (!order) backWith("/staff/queue", "error", "That order no longer exists.");
  try {
    await markReady(order.id, staff.id);
  } catch (err) {
    if (err instanceof OrderActionError) backWith(`/staff/queue/${orderId}`, "error", err.message);
    throw err;
  }
  backWith("/staff/queue", "ok", `${orderId} is marked ready. You can claim another order.`);
}

const setbackSchema = z.object({
  category: z.enum(["INGREDIENT_SHORTAGE", "EQUIPMENT_ISSUE", "PACKAGING_ISSUE", "OTHER"], "Choose what kind of setback it is."),
  description: requiredText(2000, "A description"),
});

// Logged against the order; the order keeps its status (PRD §7.2).
export async function reportSetback(form: FormData) {
  const staff = await requireRole("STAFF");
  const orderId = str(form, "orderId");
  const path = `/staff/queue/${orderId}`;
  const parsed = setbackSchema.safeParse({ category: str(form, "category"), description: str(form, "description") });
  if (!parsed.success) backWith(path, "error", firstError(parsed.error));
  const order = await db.order.findFirst({
    where: { orderId, status: "IN_PRODUCTION", claim: { staffId: staff.id, markedReadyAt: null } },
    select: { id: true },
  });
  if (!order) backWith(path, "error", "You can only report setbacks on the order you’re making.");
  await db.setbackReport.create({ data: { ...parsed.data, orderId: order.id, staffId: staff.id } });
  backWith(path, "ok", "Setback reported. The owner can see it on the order. Carry on with production.");
}
