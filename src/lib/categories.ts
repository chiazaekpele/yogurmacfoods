import type { Category } from "@/generated/prisma/enums";

// Browser-safe catalogue types and labels (no database imports).

export const CATEGORY_LABELS: Record<Category, string> = {
  YOGURT: "Greek Yogurt",
  GRANOLA: "Granola",
  ENERGY_BAR: "Energy Bars",
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  category: Category;
  image: string | null;
  fromPrice: string | null;
  sizeCount: number;
  flavourCount: number;
};

// Product grid columns for n cards on desktop, chosen so rows come out full;
// any leftover cards stretch across the last row (see .prod-grid in globals.css).
export function gridClass(n: number): string {
  const cols = n <= 4 ? Math.max(n, 1) : n % 4 === 0 ? 4 : 3;
  return `prod-grid dots cols-${cols}`;
}
