import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  // A database blip must not fail the build; the hourly refresh adds products back.
  const products = await db.product
    .findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } })
    .catch((err) => {
      console.error("sitemap: product query failed", err);
      return [];
    });
  const infoPages = await db.infoPage
    .findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } })
    .catch(() => []);
  const pages = ["", "/products", "/our-story", "/impact", "/faq", "/terms", "/privacy-policy"];
  return [
    ...pages.map((p) => ({ url: `${site}${p}` })),
    ...infoPages.map((p) => ({ url: `${site}/company/${p.slug}`, lastModified: p.updatedAt })),
    ...products.map((p) => ({ url: `${site}/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
