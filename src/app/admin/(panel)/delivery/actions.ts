"use server";

import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { backWith, nairaAmount, str } from "@/lib/admin/forms";
import { clearShippingCache } from "@/lib/shipping";
import { requireAdmin } from "@/lib/admin/session";

const PATH = "/admin/delivery";

export async function saveFee(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const raw = str(form, "fee").trim();
  const parsed = raw === "" ? { success: true as const, data: null } : nairaAmount.safeParse(raw);
  if (!parsed.success) backWith(PATH, "error", "Enter a fee in naira, e.g. 2500, or leave it empty to stop deliveries there.");

  const rate = await db.lGAShippingRate.findUnique({ where: { id } });
  if (!rate) backWith(PATH, "error", "LGA not found.");
  await db.$transaction(async (tx) => {
    await tx.lGAShippingRate.update({ where: { id }, data: { shippingFee: parsed.data } });
    await audit(tx, {
      actorId: admin.id,
      action: "SHIPPING_RATE_UPDATED",
      entityType: "LGAShippingRate",
      entityId: id,
      previousValue: { lga: rate.lgaName, fee: rate.shippingFee?.toString() ?? null },
      newValue: { lga: rate.lgaName, fee: parsed.data },
    });
  });
  // Checkout reads fees from this cache; deleting it applies the change at once (PRD §6.4).
  await clearShippingCache();
  backWith(PATH, "ok", parsed.data === null ? `Deliveries to ${rate.lgaName} are paused.` : `${rate.lgaName} delivery fee saved.`);
}
