import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { LAGOS_LGAS } from "../src/lib/lgas";

// Seed data for local development and first setup.
//
// PLACEHOLDERS — every price, delivery fee and impact number below
// is a stand-in. Products, flavours and sizes follow the supplied product photos.
// Yogurmac must confirm the real values; the owner edits them in the admin
// (/admin). Re-running this script does not overwrite edits.

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
});

// The owner can rename, reorder and add categories in the admin.
const CATEGORIES = [
  { id: "cat_yogurt", name: "Greek Yogurt", slug: "greek-yogurt", isBox: false, sortOrder: 1 },
  { id: "cat_granola", name: "Granola", slug: "granola", isBox: false, sortOrder: 2 },
  { id: "cat_energy_bars", name: "Energy Bars", slug: "energy-bars", isBox: false, sortOrder: 3 },
  { id: "cat_wellness_boxes", name: "Wellness Boxes", slug: "wellness-boxes", isBox: true, sortOrder: 4 },
] as const;

type SeedProduct = {
  name: string;
  slug: string;
  category: (typeof CATEGORIES)[number]["slug"];
  featured?: boolean;
  description: string;
  sortOrder: number;
  images: string[];
  variants: { flavour: string; size: string; price: number; imageUrl?: string }[];
};

// Product names, flavours and sizes follow the product photos Yogurmac supplied.
// Prices are still placeholders.
const IMG = "/images/products";
const PRODUCTS: SeedProduct[] = [
  {
    name: "Greek Yogurt",
    slug: "greek-yogurt",
    category: "greek-yogurt",
    sortOrder: 1,
    description:
      "Thick, creamy natural Greek yogurt, strained and made fresh for your order. Choose sweetened (low sugar) or unsweetened (sugar free).",
    images: [`${IMG}/greek-yogurt-sweetened.jpg`, `${IMG}/greek-yogurt-unsweetened.jpg`],
    variants: [
      { flavour: "Natural, sweetened", size: "500ml", price: 4500, imageUrl: `${IMG}/greek-yogurt-sweetened.jpg` },
      { flavour: "Natural, unsweetened", size: "500ml", price: 4500, imageUrl: `${IMG}/greek-yogurt-unsweetened.jpg` },
    ],
  },
  {
    name: "Greek Yogurt Parfait",
    slug: "greek-yogurt-parfait",
    category: "greek-yogurt",
    sortOrder: 2,
    description:
      "Layers of our Greek yogurt with fresh apple, coconut and crunchy granola. Keep it classic, or go indulgent with chocolate and peanuts.",
    images: [`${IMG}/parfait-classic.jpg`, `${IMG}/parfait-chocolate.jpg`],
    variants: [
      { flavour: "Classic (apple, coconut & granola)", size: "Cup", price: 3500, imageUrl: `${IMG}/parfait-classic.jpg` },
      { flavour: "Chocolate & peanut", size: "Cup", price: 4000, imageUrl: `${IMG}/parfait-chocolate.jpg` },
    ],
  },
  {
    name: "Cranola High Fibre Granola",
    slug: "cranola-granola",
    category: "granola",
    sortOrder: 3,
    description:
      "Crunchy honey-almond granola made from whole-grain oats, coconut, almonds, dates, golden raisins and flax seeds. Sugar free, vegan friendly and preservative free.",
    images: [`${IMG}/cranola-honey-almond.jpg`],
    variants: [{ flavour: "Honey-Almond", size: "Jar", price: 6500 }],
  },
  {
    name: "Ridi Energy Bar",
    slug: "ridi-energy-bar",
    category: "energy-bars",
    sortOrder: 4,
    description:
      "Clara’s Ridi bars: crunchy, seed-packed energy bars for steady energy through a busy Lagos day. Made in small batches, fresh to order.",
    images: [`${IMG}/ridi-peanut.jpg`, `${IMG}/ridi-chocolate.jpg`],
    variants: [
      { flavour: "Peanut", size: "55g bar", price: 800, imageUrl: `${IMG}/ridi-peanut.jpg` },
      { flavour: "Chocolate", size: "55g bar", price: 900, imageUrl: `${IMG}/ridi-chocolate.jpg` },
    ],
  },
  // Wellness boxes (prices from Yogurmac, 13 Oct 2026). Tiers are the
  // variants' "flavour"; the owner adds each tier's contents and photos in the admin.
  {
    name: "Solo Executive Wellness Box",
    slug: "solo-executive-wellness-box",
    category: "wellness-boxes",
    featured: false,
    sortOrder: 10,
    description: "A wellness box for one, for a busy working day. Full contents of each tier coming soon.",
    images: [],
    variants: [
      { flavour: "Bronze (Basic)", size: "Box", price: 15000 },
      { flavour: "Silver (Standard)", size: "Box", price: 20000 },
      { flavour: "Gold (Premium)", size: "Box", price: 30000 },
    ],
  },
  {
    name: "Family Wellness Box",
    slug: "family-wellness-box",
    category: "wellness-boxes",
    featured: false,
    sortOrder: 11,
    description: "Wholesome nourishment for the whole family. Full contents of each tier coming soon.",
    images: [],
    variants: [
      { flavour: "Bronze (Basic)", size: "Box", price: 75000 },
      { flavour: "Silver (Standard)", size: "Box", price: 120000 },
      { flavour: "Gold (Premium)", size: "Box", price: 280000 },
    ],
  },
  {
    name: "Corporate Catalyst Box",
    slug: "corporate-catalyst-box",
    category: "wellness-boxes",
    featured: false,
    sortOrder: 12,
    description: "Wellness for your whole team at work. Full contents of each tier coming soon.",
    images: [],
    variants: [
      { flavour: "Silver", size: "Box", price: 350000 },
      { flavour: "Gold", size: "Box", price: 500000 },
    ],
  },
  {
    name: "Period Care Box",
    slug: "period-care-box",
    category: "wellness-boxes",
    featured: false,
    sortOrder: 13,
    description: "Comfort and nourishment for your period. Full contents of each size coming soon.",
    images: [],
    variants: [
      { flavour: "Mini Box", size: "Box", price: 12000 },
      { flavour: "Maxi Box", size: "Box", price: 20000 },
    ],
  },
];

// Delivery fees per LGA, from Yogurmac (14 Oct 2026). The owner can change
// them in the admin (Delivery fees).
const LGA_FEES: Record<string, number> = {
  Agege: 4500, "Ajeromi-Ifelodun": 4500, Alimosho: 4200, "Amuwo-Odofin": 4200, Apapa: 4200,
  Badagry: 4300, Epe: 7500, "Eti-Osa": 5000, "Ibeju-Lekki": 7000, "Ifako-Ijaiye": 4300,
  Ikeja: 4000, Ikorodu: 5200, Kosofe: 3200, "Lagos Island": 4200, "Lagos Mainland": 2200,
  Mushin: 2500, Ojo: 6800, "Oshodi-Isolo": 3200, Shomolu: 2500, Surulere: 3200,
};

const IMPACT = [
  { key: "children_reached", label: "Children reached", value: 900, sortOrder: 1 },
  { key: "campaigns_run", label: "Outreach campaigns", value: 18, sortOrder: 2 },
  { key: "schools_visited", label: "Schools visited", value: 4, sortOrder: 3 },
];

async function main() {
  const production = process.env.SEED_PRODUCTION === "1";

  for (const lga of LAGOS_LGAS) {
    await db.lGAShippingRate.upsert({
      where: { lgaName: lga },
      update: {},
      create: { lgaName: lga, shippingFee: LGA_FEES[lga] },
    });
  }

  for (const s of IMPACT) {
    await db.impactStat.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  if (production) {
    console.log("Seeded LGAs (fees unset) and impact stats only.");
    return;
  }

  for (const { id, ...c } of CATEGORIES) {
    await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { id, ...c } });
  }

  for (const p of PRODUCTS) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        category: { connect: { slug: p.category } },
        description: p.description,
        sortOrder: p.sortOrder,
        isFeatured: p.featured ?? true,
        images: p.images,
        variants: { create: p.variants },
      },
    });
  }


  console.log("Seeded sample products, LGA fees and impact stats (placeholders).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
