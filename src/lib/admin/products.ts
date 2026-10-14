import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "./audit";
import { db } from "@/lib/db";
import { nairaAmount, optionalText, plainText, requiredText } from "./forms";

import { slugify } from "./product-meta";

type Tx = Prisma.TransactionClient;

// Photos bundled with the shop (public/images/products) or uploaded in the admin (/media/<id>).
export const isShopImage = (u: string) => /^\/images\/[a-z0-9/-]+\.(jpe?g|png|webp)$/.test(u) || /^\/media\/[a-z0-9]{20,40}$/.test(u);

export const productSchema = z.object({
  name: requiredText(120, "Product name"),
  // An existing category, or a new one the owner names on the form.
  categoryId: z.string().max(40).nullable(),
  newCategory: z.object({ name: requiredText(60, "The new category’s name"), isBox: z.boolean() }).nullable(),
  description: requiredText(2000, "Description"),
  images: z
    .array(z.string().max(500))
    .max(5, "Up to 5 images.")
    .refine((urls) => urls.every(isShopImage), "Images must be uploaded through the form."),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string().max(40).optional(),
        flavour: requiredText(60, "Flavour"),
        size: requiredText(40, "Size"),
        price: nairaAmount.refine((p) => Number(p) > 0, "Price must be more than zero."),
        isAvailable: z.boolean(),
        imageUrl: z.string().max(500).nullable().optional(),
        // Box tiers: what's in the box, one item per line.
        contents: optionalText(2000),
      }),
    )
    .min(1, "Add at least one flavour and size.")
    .max(60),
  sortOrder: z.number().int().min(0).max(9999).optional(),
}).refine((p) => p.categoryId || p.newCategory, { message: "Choose a category.", path: ["categoryId"] })
.refine((p) => p.variants.every((v) => !v.imageUrl || p.images.includes(v.imageUrl)), {
  message: "A flavour’s photo must be one of this product’s photos.",
  path: ["variants"],
});
export type ProductInput = z.infer<typeof productSchema>;

export class ProductSaveError extends Error {}

// A web address (slug) nobody else uses: "family-box", then "family-box-2", …
export async function uniqueSlug(taken: (slug: string) => Promise<boolean>, name: string, fallback: string): Promise<string> {
  const base = slugify(name) || fallback;
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base.slice(0, 75)}-${n}`;
    if (!(await taken(slug))) return slug;
  }
}

// The chosen category, or the new one named on the form (reused if the name already exists).
async function resolveCategory(tx: Tx, adminId: string, input: ProductInput) {
  if (!input.newCategory) {
    const cat = await tx.category.findUnique({ where: { id: input.categoryId ?? "" } });
    if (!cat) throw new ProductSaveError("That category no longer exists. Choose another.");
    return cat;
  }
  const { name, isBox } = input.newCategory;
  const existing = await tx.category.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing;
  const last = await tx.category.aggregate({ _max: { sortOrder: true } });
  const slug = await uniqueSlug(async (s) => !!(await tx.category.findUnique({ where: { slug: s } })), name, "category");
  const cat = await tx.category.create({ data: { name, slug, isBox, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  await audit(tx, { actorId: adminId, action: "CATEGORY_CREATED", entityType: "Category", entityId: cat.id, newValue: { name, isBox } });
  return cat;
}

// Returns notices for the admin (e.g. variants kept as unavailable).
export async function saveProduct(adminId: string, input: ProductInput, productId?: string): Promise<{ id: string; slug: string; notices: string[] }> {
  const keys = new Set<string>();
  for (const v of input.variants) {
    const key = `${v.flavour.toLowerCase()}|${v.size.toLowerCase()}`;
    if (keys.has(key)) throw new ProductSaveError(`“${v.flavour}, ${v.size}” is listed twice.`);
    keys.add(key);
  }
  const notices: string[] = [];

  try {
    return await db.$transaction(async (tx) => {
      const category = await resolveCategory(tx, adminId, input);
      // Contents only apply to box tiers.
      const variants = input.variants.map((v) => ({ ...v, contents: category.isBox ? v.contents : null }));
      const data = {
        name: input.name,
        categoryId: category.id,
        description: input.description,
        images: input.images,
        isFeatured: input.isFeatured,
        isActive: input.isActive,
      };

      if (!productId) {
        // The web address comes from the name and never changes, so shared links keep working.
        const slug = await uniqueSlug(async (s) => !!(await tx.product.findUnique({ where: { slug: s } })), input.name, "product");
        const created = await tx.product.create({
          data: { ...data, slug, variants: { create: variants.map(({ id: _id, ...v }) => v) } },
        });
        await audit(tx, { actorId: adminId, action: "PRODUCT_CREATED", entityType: "Product", entityId: created.id, newValue: { name: data.name, slug, variants: variants.length } });
        return { id: created.id, slug, notices };
      }

      const before = await tx.product.findUnique({ where: { id: productId }, include: { variants: { include: { _count: { select: { orderItems: true } } } } } });
      if (!before) throw new ProductSaveError("This product no longer exists.");
      await tx.product.update({ where: { id: productId }, data });

      const keep = new Set(variants.map((v) => v.id).filter(Boolean));
      for (const old of before.variants) {
        if (keep.has(old.id)) continue;
        if (old._count.orderItems > 0) {
          // Past orders reference it, so it stays (PRD §11).
          await tx.productVariant.update({ where: { id: old.id }, data: { isAvailable: false } });
          notices.push(`“${old.flavour}, ${old.size}” has existing orders and cannot be deleted. It has been marked unavailable instead.`);
        } else {
          await tx.productVariant.delete({ where: { id: old.id } });
        }
      }
      // Removed rows above may free a flavour/size pair; apply changes after deletions.
      for (const v of variants) {
        const { id, ...fields } = v;
        if (id && before.variants.some((o) => o.id === id)) await tx.productVariant.update({ where: { id }, data: fields });
        else await tx.productVariant.create({ data: { ...fields, productId } });
      }

      await audit(tx, {
        actorId: adminId,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: productId,
        previousValue: {
          name: before.name,
          slug: before.slug,
          isActive: before.isActive,
          isFeatured: before.isFeatured,
          variants: before.variants.map((v) => ({ flavour: v.flavour, size: v.size, price: v.price.toString(), isAvailable: v.isAvailable })),
        },
        newValue: { ...data, variants: variants.map(({ id: _id, ...v }) => v) },
      });
      return { id: productId, slug: before.slug, notices };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = JSON.stringify(err.meta ?? {});
      throw new ProductSaveError(target.includes("slug") ? "Someone saved a product with the same name at the same moment. Please try again." : "Two options have the same name and size.");
    }
    throw err;
  }
}
