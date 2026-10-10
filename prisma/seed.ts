import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { LAGOS_LGAS } from "../src/lib/lgas";

// Seed data for local development and first setup.
//
// PLACEHOLDERS — every price, delivery fee, tier amount and impact number below
// is a stand-in. Products, flavours and sizes follow the supplied product photos.
// Yogurmac must confirm the real values; the admin edits them in the staff
// portal. Re-running this script does not overwrite edits.

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
});

type SeedProduct = {
  name: string;
  slug: string;
  category: "YOGURT" | "GRANOLA" | "ENERGY_BAR";
  description: string;
  sortOrder: number;
  // Served from public/images/products until Cloudinary is set up.
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
    category: "YOGURT",
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
    category: "YOGURT",
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
    category: "GRANOLA",
    sortOrder: 3,
    description:
      "Crunchy honey-almond granola made from whole-grain oats, coconut, almonds, dates, golden raisins and flax seeds. Sugar free, vegan friendly and preservative free.",
    images: [`${IMG}/cranola-honey-almond.jpg`],
    variants: [{ flavour: "Honey-Almond", size: "Jar", price: 6500 }],
  },
  {
    name: "Ridi Energy Bar",
    slug: "ridi-energy-bar",
    category: "ENERGY_BAR",
    sortOrder: 4,
    description:
      "Clara’s Ridi bars: crunchy, seed-packed energy bars for steady energy through a busy Lagos day. Made in small batches, fresh to order.",
    images: [`${IMG}/ridi-peanut.jpg`, `${IMG}/ridi-chocolate.jpg`],
    variants: [
      { flavour: "Peanut", size: "55g bar", price: 800, imageUrl: `${IMG}/ridi-peanut.jpg` },
      { flavour: "Chocolate", size: "55g bar", price: 900, imageUrl: `${IMG}/ridi-chocolate.jpg` },
    ],
  },
];

// Sample fees so checkout works locally. Production starts every fee unset (null),
// which blocks checkout for that LGA until the admin sets it (TRD §5.7).
const SAMPLE_FEES: Record<string, number> = {
  Ikeja: 2000, Surulere: 2000, Mushin: 2000, Shomolu: 2000, Kosofe: 2000, "Lagos Mainland": 2000,
  "Oshodi-Isolo": 2000, Agege: 2500, "Ifako-Ijaiye": 2500, Apapa: 2500, "Ajeromi-Ifelodun": 2500,
  "Amuwo-Odofin": 2500, "Lagos Island": 2500, "Eti-Osa": 3000, Alimosho: 3000, Ojo: 3500,
  Ikorodu: 3500, "Ibeju-Lekki": 4500, Epe: 5000, Badagry: 5000,
};

const TIERS = [
  { name: "Seed Partner", description: "Feeds one child per quarter", monthlyAmount: 5000, sortOrder: 1 },
  { name: "Growth Partner", description: "Feeds a classroom per quarter", monthlyAmount: 20000, sortOrder: 2 },
  { name: "Legacy Partner", description: "Funds a full school visit", monthlyAmount: 50000, sortOrder: 3 },
];

const IMPACT = [
  { key: "children_reached", label: "Children reached", value: 900, sortOrder: 1 },
  { key: "campaigns_run", label: "Outreach campaigns", value: 18, sortOrder: 2 },
  { key: "schools_visited", label: "Schools visited", value: 12, sortOrder: 3 },
];

async function main() {
  const production = process.env.SEED_PRODUCTION === "1";

  for (const lga of LAGOS_LGAS) {
    await db.lGAShippingRate.upsert({
      where: { lgaName: lga },
      update: {},
      create: { lgaName: lga, shippingFee: production ? null : SAMPLE_FEES[lga] },
    });
  }

  for (const s of IMPACT) {
    await db.impactStat.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  if (production) {
    console.log("Seeded LGAs (fees unset) and impact stats only.");
    return;
  }

  for (const p of PRODUCTS) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        category: p.category,
        description: p.description,
        sortOrder: p.sortOrder,
        isFeatured: true,
        images: p.images,
        variants: { create: p.variants },
      },
    });
  }

  if ((await db.subscriptionTier.count()) === 0) {
    await db.subscriptionTier.createMany({ data: TIERS });
  }

  console.log("Seeded sample products, LGA fees, tiers and impact stats (placeholders).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
