import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "./audit";
import { imageUrlPrefix } from "./cloudinary";
import { db } from "./db";
import { nairaAmount, plainText, requiredText } from "./forms";

import { CATEGORIES } from "./product-meta";

export { CATEGORIES, CATEGORY_LABELS, slugify } from "./product-meta";

export const productSchema = z.object({
  name: requiredText(120, "Product name"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.")
    .max(80),
  category: z.enum(CATEGORIES, "Choose a category."),
  description: requiredText(2000, "Description"),
  images: z
    .array(z.string().max(500))
    .max(5, "Up to 5 images.")
    .refine((urls) => {
      const prefix = imageUrlPrefix();
      // Cloudinary uploads, or the photos bundled with the shop (public/images/products).
      return urls.every((u) => /^\/images\/products\/[a-z0-9-]+\.(jpe?g|png|webp)$/.test(u) || (prefix && u.startsWith(prefix)));
    }, "Images must be uploaded through the form."),
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
      }),
    )
    .min(1, "Add at least one flavour and size.")
    .max(60),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

export class ProductSaveError extends Error {}

// Returns notices for the admin (e.g. variants kept as unavailable).
export async function saveProduct(adminId: string, input: ProductInput, productId?: string): Promise<{ id: string; notices: string[]; oldSlug?: string }> {
  const keys = new Set<string>();
  for (const v of input.variants) {
    const key = `${v.flavour.toLowerCase()}|${v.size.toLowerCase()}`;
    if (keys.has(key)) throw new ProductSaveError(`“${v.flavour}, ${v.size}” is listed twice.`);
    keys.add(key);
  }
  const notices: string[] = [];

  try {
    return await db.$transaction(async (tx) => {
      const data = {
        name: input.name,
        slug: input.slug,
        category: input.category,
        description: input.description,
        images: input.images,
        isFeatured: input.isFeatured,
        isActive: input.isActive,
      };

      if (!productId) {
        const created = await tx.product.create({
          data: { ...data, variants: { create: input.variants.map(({ id: _id, ...v }) => v) } },
        });
        await audit(tx, { actorId: adminId, action: "PRODUCT_CREATED", entityType: "Product", entityId: created.id, newValue: { name: data.name, slug: data.slug, variants: input.variants.length } });
        return { id: created.id, notices };
      }

      const before = await tx.product.findUnique({ where: { id: productId }, include: { variants: { include: { _count: { select: { orderItems: true } } } } } });
      if (!before) throw new ProductSaveError("This product no longer exists.");
      await tx.product.update({ where: { id: productId }, data });

      const keep = new Set(input.variants.map((v) => v.id).filter(Boolean));
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
      for (const v of input.variants) {
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
        newValue: { ...data, variants: input.variants.map(({ id: _id, ...v }) => v) },
      });
      return { id: productId, notices, oldSlug: before.slug };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = JSON.stringify(err.meta ?? {});
      throw new ProductSaveError(target.includes("slug") ? "Another product already uses this web address (slug)." : "Two variants have the same flavour and size.");
    }
    throw err;
  }
}
