// Browser-safe product helpers (no database imports).
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export type CategoryOption = { id: string; name: string; isBox: boolean };
