// Browser-safe product helpers (no database imports).
export const CATEGORIES = ["YOGURT", "GRANOLA", "ENERGY_BAR", "WELLNESS_BOX"] as const;
export const CATEGORY_LABELS = { YOGURT: "Greek Yogurt", GRANOLA: "Granola", ENERGY_BAR: "Energy Bars", WELLNESS_BOX: "Wellness Box" } as const;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

