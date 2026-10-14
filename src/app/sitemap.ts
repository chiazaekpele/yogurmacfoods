import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // A database blip must not fail the build; the hourly refresh adds products back.
  const products = await db.product
    .findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } })
    .catch((err) => {
      console.error("sitemap: product query failed", err);
      return [];
    });
  const pages = ["", "/products", "/our-story", "/impact", "/faq", "/terms", "/privacy-policy"];
  return [
    ...pages.map((p) => ({ url: `${site}${p}` })),
    ...products.map((p) => ({ url: `${site}/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
