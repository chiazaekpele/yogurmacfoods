import type { HeroSlide } from "@/components/HeroCarousel";
import { db } from "./db";

// Shown if the database can't be reached, or every slide is hidden.
const FALLBACK: HeroSlide[] = [
  { src: "/images/products/parfait-classic.jpg", alt: "Yogurmac Greek yogurt parfait with apple, coconut and granola", href: "/products", position: "center 12%" },
];

// Homepage images, managed in the admin (Homepage images).
export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const rows = await db.heroSlide.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    if (!rows.length) return FALLBACK;
    return rows.map((r) => ({
      src: r.imageUrl,
      alt: r.alt,
      href: r.href,
      position: r.position ?? undefined,
      fit: r.fit === "contain" ? "contain" : "cover",
      background: r.background ?? undefined,
    }));
  } catch (err) {
    console.error("Hero slides unavailable:", err);
    return FALLBACK;
  }
}
