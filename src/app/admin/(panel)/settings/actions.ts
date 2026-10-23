"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { backWith, firstError, optionalText, str } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { clearChromeCache } from "@/lib/chrome-data";
import { clearSettingsCache } from "@/lib/settings";

const PATH = "/admin/settings";

const schema = z
  .object({
    vatRate: z
      .string()
      .trim()
      .regex(/^\d{1,2}(\.\d{1,2})?$/, "Enter the VAT rate as a number, e.g. 7.5 (or 0 for no VAT).")
      .refine((v) => Number(v) <= 50, "The VAT rate looks too high."),
    pickupEnabled: z.boolean(),
    pickupAddress: optionalText(300),
    pickupNote: optionalText(300),
    contactEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid contact email.")]).transform((v) => v || null),
    phone: optionalText(40),
    whatsapp: optionalText(200),
    instagram: optionalText(200),
    facebook: optionalText(200),
    tiktok: optionalText(200),
    x: optionalText(200),
    youtube: optionalText(200),
    linkedin: optionalText(200),
  })
  .refine((v) => !v.pickupEnabled || v.pickupAddress, { message: "Add the pickup address before switching pickup on.", path: ["pickupAddress"] });

export async function saveSettings(form: FormData) {
  const admin = await requireAdmin();
  const text = (k: string) => str(form, k);
  const parsed = schema.safeParse({
    vatRate: text("vatRate") || "0",
    pickupEnabled: form.get("pickupEnabled") === "on",
    pickupAddress: text("pickupAddress"),
    pickupNote: text("pickupNote"),
    contactEmail: text("contactEmail"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    instagram: text("instagram"),
    facebook: text("facebook"),
    tiktok: text("tiktok"),
    x: text("x"),
    youtube: text("youtube"),
    linkedin: text("linkedin"),
  });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  const data = parsed.data;
  await db.$transaction(async (tx) => {
    const before = await tx.siteSettings.findUnique({ where: { id: "site" } });
    await tx.siteSettings.upsert({ where: { id: "site" }, update: data, create: { id: "site", ...data } });
    await audit(tx, {
      actorId: admin.id,
      action: "SETTINGS_UPDATED",
      entityType: "SiteSettings",
      entityId: "site",
      previousValue: before ? { vatRate: before.vatRate.toString(), pickupEnabled: before.pickupEnabled } : undefined,
      newValue: { vatRate: data.vatRate, pickupEnabled: data.pickupEnabled },
    });
  });
  clearSettingsCache();
  clearChromeCache();
  // The footer's Contact us section is on every page.
  revalidatePath("/", "layout");
  backWith(PATH, "ok", "Settings saved. The shop shows them straight away.");
}
