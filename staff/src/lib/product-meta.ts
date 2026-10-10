// Browser-safe product helpers (no database imports).
export const CATEGORIES = ["YOGURT", "GRANOLA", "ENERGY_BAR"] as const;
export const CATEGORY_LABELS = { YOGURT: "Greek Yogurt", GRANOLA: "Granola", ENERGY_BAR: "Energy Bars" } as const;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

// Shop-bundled photos are stored as /images/products/… paths on the shop's domain.
export function imageSrc(url: string): string {
  return url.startsWith("/") ? `${(process.env.NEXT_PUBLIC_SHOP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${url}` : url;
}
