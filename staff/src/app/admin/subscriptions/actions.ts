"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { backWith, firstError, nairaAmount, requiredText, str } from "@/lib/forms";
import { createMonthlyPlan, PaystackError } from "@/lib/paystack";
import { requireRole } from "@/lib/session";
import { revalidateShop } from "@/lib/shop";

const PATH = "/admin/subscriptions";
const SHOP_PATHS = ["/", "/partner"];

const tierSchema = z.object({
  name: requiredText(80, "Tier name"),
  description: requiredText(400, "Description"),
  monthlyAmount: nairaAmount.refine((a) => Number(a) >= 100, "The monthly amount must be at least ₦100."),
});

export async function createTier(form: FormData) {
  const admin = await requireRole("ADMIN");
  const parsed = tierSchema.safeParse({ name: str(form, "name"), description: str(form, "description"), monthlyAmount: str(form, "monthlyAmount") });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));

  // The tier is only saved once Paystack has created its plan (PRD §11).
  let planCode: string;
  try {
    planCode = await createMonthlyPlan(`Yogurmac Partner — ${parsed.data.name}`, parsed.data.monthlyAmount);
  } catch (err) {
    if (err instanceof PaystackError) backWith(PATH, "error", `Paystack didn’t create the plan: ${err.message} The tier was not saved; please try again.`);
    throw err;
  }
  const count = await db.subscriptionTier.count();
  await db.$transaction(async (tx) => {
    const tier = await tx.subscriptionTier.create({ data: { ...parsed.data, paystackPlanCode: planCode, sortOrder: count } });
    await audit(tx, { actorId: admin.id, action: "TIER_CREATED", entityType: "SubscriptionTier", entityId: tier.id, newValue: { ...parsed.data, planCode } });
  });
  await revalidateShop(SHOP_PATHS);
  backWith(PATH, "ok", `${parsed.data.name} tier created.`);
}

export async function updateTier(form: FormData) {
  const admin = await requireRole("ADMIN");
  const id = str(form, "id");
  const tier = await db.subscriptionTier.findUnique({ where: { id }, include: { _count: { select: { subscriptions: true } } } });
  if (!tier) backWith(PATH, "error", "Tier not found.");
  const parsed = tierSchema.safeParse({
    name: str(form, "name"),
    description: str(form, "description"),
    monthlyAmount: str(form, "monthlyAmount") || tier.monthlyAmount.toString(),
  });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));

  const amountChanged = parsed.data.monthlyAmount !== tier.monthlyAmount.toString() && Number(parsed.data.monthlyAmount) !== Number(tier.monthlyAmount);
  // Protects existing partners' billing (PRD §6.6).
  if (amountChanged && tier._count.subscriptions > 0) backWith(PATH, "error", "The monthly amount can’t change once a tier has partners. Create a new tier instead.");

  let planCode = tier.paystackPlanCode;
  if (amountChanged) {
    try {
      planCode = await createMonthlyPlan(`Yogurmac Partner — ${parsed.data.name}`, parsed.data.monthlyAmount);
    } catch (err) {
      if (err instanceof PaystackError) backWith(PATH, "error", `Paystack didn’t update the plan: ${err.message}`);
      throw err;
    }
  }
  await db.$transaction(async (tx) => {
    await tx.subscriptionTier.update({ where: { id }, data: { ...parsed.data, paystackPlanCode: planCode } });
    await audit(tx, {
      actorId: admin.id,
      action: "TIER_UPDATED",
      entityType: "SubscriptionTier",
      entityId: id,
      previousValue: { name: tier.name, description: tier.description, monthlyAmount: tier.monthlyAmount.toString() },
      newValue: parsed.data,
    });
  });
  await revalidateShop(SHOP_PATHS);
  backWith(PATH, "ok", `${parsed.data.name} saved.`);
}

export async function toggleTier(form: FormData) {
  const admin = await requireRole("ADMIN");
  const tier = await db.subscriptionTier.findUnique({ where: { id: str(form, "id") } });
  if (!tier) backWith(PATH, "error", "Tier not found.");
  await db.$transaction(async (tx) => {
    await tx.subscriptionTier.update({ where: { id: tier.id }, data: { isActive: !tier.isActive } });
    await audit(tx, { actorId: admin.id, action: "TIER_UPDATED", entityType: "SubscriptionTier", entityId: tier.id, previousValue: { isActive: tier.isActive }, newValue: { isActive: !tier.isActive } });
  });
  await revalidateShop(SHOP_PATHS);
  backWith(PATH, "ok", tier.isActive ? `${tier.name} is hidden from the shop. Existing partners keep their giving.` : `${tier.name} is showing on the shop again.`);
}
