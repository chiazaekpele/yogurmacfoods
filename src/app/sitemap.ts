import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
  const pages = ["", "/products", "/our-story", "/ythirst", "/partner", "/privacy-policy"];
  return [
    ...pages.map((p) => ({ url: `${site}${p}` })),
    ...products.map((p) => ({ url: `${site}/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
