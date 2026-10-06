import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { LAGOS_LGAS } from "../src/lib/lgas";

// Seed data for local development and first setup.
//
// PLACEHOLDERS — every price, flavour, size, delivery fee, tier amount and impact
// number below is a stand-in (starting prices and counts come from the homepage
// mockup). Yogurmac must supply the real values; once the staff portal exists the
// admin edits them there. Re-running this script does not overwrite edits.

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
});

type SeedProduct = {
  name: string;
  slug: string;
  category: "YOGURT" | "GRANOLA" | "ENERGY_BAR";
  description: string;
  sortOrder: number;
  sizes: { size: string; base: number }[];
  flavours: { flavour: string; extra: number }[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Classic Natural Yogurt",
    slug: "classic-natural-yogurt",
    category: "YOGURT",
    sortOrder: 1,
    description:
      "Thick, creamy Greek yogurt, strained by hand and made fresh for your order. Rich in protein and naturally tangy — perfect on its own, with granola, or in your morning smoothie.",
    sizes: [
      { size: "250ml", base: 2500 },
      { size: "500ml", base: 4500 },
      { size: "1 litre", base: 8000 },
    ],
    flavours: [
      { flavour: "Natural", extra: 0 },
      { flavour: "Strawberry", extra: 300 },
      { flavour: "Almond Berry", extra: 500 },
      { flavour: "Vanilla Honey", extra: 300 },
    ],
  },
  {
    name: "Honey & Oat Granola",
    slug: "honey-oat-granola",
    category: "GRANOLA",
    sortOrder: 2,
    description:
      "Golden, crunchy clusters of oats baked slowly with honey. A wholesome breakfast and the perfect partner for our Greek yogurt.",
    sizes: [
      { size: "250g", base: 1800 },
      { size: "500g", base: 3300 },
    ],
    flavours: [
      { flavour: "Honey & Oat", extra: 0 },
      { flavour: "Cranberry", extra: 300 },
      { flavour: "Coconut", extra: 200 },
    ],
  },
  {
    name: "Nutrient Energy Bars",
    slug: "nutrient-energy-bars",
    category: "ENERGY_BAR",
    sortOrder: 3,
    description:
      "Dense, chewy bars packed with oats, nuts and seeds for steady energy through a busy Lagos day. Made in small batches, fresh to order.",
    sizes: [
      { size: "Single bar", base: 800 },
      { size: "Box of 6", base: 4500 },
    ],
    flavours: [
      { flavour: "Peanut", extra: 0 },
      { flavour: "Date & Almond", extra: 100 },
      { flavour: "Chocolate", extra: 100 },
      { flavour: "Coconut", extra: 0 },
      { flavour: "Mixed Berry", extra: 150 },
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
        images: [],
        variants: {
          create: p.sizes.flatMap((s) =>
            p.flavours.map((f) => ({
              flavour: f.flavour,
              size: s.size,
              // Flavour premium scales with pack size, rounded to the nearest ₦50.
              price: Math.round((s.base + f.extra * (s.base / p.sizes[0].base)) / 50) * 50,
            })),
          ),
        },
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
