import { normaliseNigerianMobile } from "./phone";
import type { SiteSettings } from "./settings";

// Contact us links from the admin's settings (browser-safe). Handles may be
// typed as "yogurmacfoods", "@yogurmacfoods" or a full link.
const SOCIAL = [
  ["instagram", "Instagram", "https://www.instagram.com/"],
  ["facebook", "Facebook", "https://www.facebook.com/"],
  ["tiktok", "TikTok", "https://www.tiktok.com/@"],
  ["x", "X (Twitter)", "https://x.com/"],
  ["youtube", "YouTube", "https://www.youtube.com/@"],
  ["linkedin", "LinkedIn", "https://www.linkedin.com/company/"],
] as const;

export type ContactLink = { label: string; text: string; href: string };

function socialHref(value: string, base: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return base + value.replace(/^@/, "").replace(/^\/+/, "");
}

export function contactLinks(s: Pick<SiteSettings, "contactEmail" | "phone" | "whatsapp" | (typeof SOCIAL)[number][0]>): ContactLink[] {
  const out: ContactLink[] = [];
  if (s.contactEmail) out.push({ label: "Email", text: s.contactEmail, href: `mailto:${s.contactEmail}` });
  if (s.phone) out.push({ label: "Phone", text: s.phone, href: `tel:${normaliseNigerianMobile(s.phone) ?? s.phone.replace(/[^\d+]/g, "")}` });
  if (s.whatsapp) {
    const n = normaliseNigerianMobile(s.whatsapp);
    out.push({ label: "WhatsApp", text: s.whatsapp, href: /^https?:\/\//i.test(s.whatsapp) ? s.whatsapp : `https://wa.me/${(n ?? s.whatsapp).replace(/\D/g, "")}` });
  }
  for (const [key, label, base] of SOCIAL) {
    const v = s[key]?.trim();
    if (v) out.push({ label, text: /^https?:\/\//i.test(v) ? label : `@${v.replace(/^@/, "")}`, href: socialHref(v, base) });
  }
  return out;
}
