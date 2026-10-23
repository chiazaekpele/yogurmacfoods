import { db } from "./db";

// Shop-wide settings edited in the admin (Settings): VAT, pickup, contact.
export type SiteSettings = {
  vatRate: number; // percent, 0 = no VAT
  pickupEnabled: boolean;
  pickupAddress: string | null;
  pickupNote: string | null;
  contactEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  x: string | null;
  youtube: string | null;
  linkedin: string | null;
};

const DEFAULTS: SiteSettings = {
  vatRate: 7.5,
  pickupEnabled: false,
  pickupAddress: null,
  pickupNote: null,
  contactEmail: null,
  phone: null,
  whatsapp: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  x: null,
  youtube: null,
  linkedin: null,
};

// Read on every page (footer), so kept for a minute per server instance;
// saving in the admin clears it on that instance at once. Checkout passes
// fresh: true so prices always use the current VAT rate and pickup setting.
const TTL_MS = 60_000;
let cached: { at: number; value: SiteSettings } | null = null;

export async function getSiteSettings(opts: { fresh?: boolean } = {}): Promise<SiteSettings> {
  if (!opts.fresh && cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const row = await db.siteSettings.findUnique({ where: { id: "site" } });
  const value: SiteSettings = row
    ? {
        vatRate: Number(row.vatRate),
        pickupEnabled: row.pickupEnabled,
        pickupAddress: row.pickupAddress,
        pickupNote: row.pickupNote,
        contactEmail: row.contactEmail,
        phone: row.phone,
        whatsapp: row.whatsapp,
        instagram: row.instagram,
        facebook: row.facebook,
        tiktok: row.tiktok,
        x: row.x,
        youtube: row.youtube,
        linkedin: row.linkedin,
      }
    : DEFAULTS;
  cached = { at: Date.now(), value };
  return value;
}

export function clearSettingsCache() {
  cached = null;
}

// Pickup is offered only when switched on and an address is set.
export const pickupAvailable = (s: SiteSettings) => s.pickupEnabled && !!s.pickupAddress?.trim();
