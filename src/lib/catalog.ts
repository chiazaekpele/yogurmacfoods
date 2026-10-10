import type { Category } from "@/generated/prisma/client";
import { type ProductSummary } from "./categories";
import { db } from "./db";

export { CATEGORY_LABELS, gridClass, type ProductSummary } from "./categories";

// Read-only queries for public pages. Only active products and available
// variants are ever exposed to the shop.

export async function listProducts(opts: { featuredOnly?: boolean; category?: Category } = {}) {
  const products = await db.product.findMany({
    where: {
      isActive: true,
      ...(opts.featuredOnly ? { isFeatured: true } : {}),
      ...(opts.category ? { category: opts.category } : {}),
    },
    include: { variants: { where: { isAvailable: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: opts.featuredOnly ? 6 : undefined,
  });

  return products.map<ProductSummary>((p) => {
    const prices = p.variants.map((v) => v.price);
    const lowest = prices.reduce<(typeof prices)[number] | null>((min, x) => (min === null || x.lt(min) ? x : min), null);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      image: p.images[0] ?? null,
      fromPrice: lowest?.toString() ?? null,
      sizeCount: new Set(p.variants.map((v) => v.size)).size,
      flavourCount: new Set(p.variants.map((v) => v.flavour)).size,
    };
  });
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findFirst({
    where: { slug, isActive: true },
    include: { variants: { orderBy: { price: "asc" } } },
  });
  if (!product) return null;
  return {
    ...product,
    variants: product.variants.map((v) => ({
      id: v.id,
      flavour: v.flavour,
      size: v.size,
      price: v.price.toString(),
      isAvailable: v.isAvailable,
      imageUrl: v.imageUrl,
    })),
  };
}

export async function getImpactStats() {
  return db.impactStat.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function listActiveTiers() {
  const tiers = await db.subscriptionTier.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { monthlyAmount: "asc" }],
  });
  return tiers.map((t) => ({ ...t, monthlyAmount: t.monthlyAmount.toString() }));
}
