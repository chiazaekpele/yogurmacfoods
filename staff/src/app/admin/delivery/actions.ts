"use server";

import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { backWith, nairaAmount, str } from "@/lib/forms";
import { keyPrefix, redis } from "@/lib/redis";
import { requireRole } from "@/lib/session";

const PATH = "/admin/delivery";
// Must match the shop's cache key (src/lib/shipping.ts in the shop).
const CACHE_KEY = `${keyPrefix}shipping:rates:v1`;

export async function saveFee(form: FormData) {
  const admin = await requireRole("ADMIN");
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
  if (redis) await redis.del(CACHE_KEY).catch((err) => console.error("Shipping cache delete failed:", err));
  backWith(PATH, "ok", parsed.data === null ? `Deliveries to ${rate.lgaName} are paused.` : `${rate.lgaName} delivery fee saved.`);
}
