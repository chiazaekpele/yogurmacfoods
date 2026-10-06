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
