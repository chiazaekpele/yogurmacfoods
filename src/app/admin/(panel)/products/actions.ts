"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { backWith, str } from "@/lib/admin/forms";
import { ProductSaveError, productSchema, saveProduct } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/admin/session";
import { revalidatePath } from "next/cache";

const LIST = "/admin/products";

export async function toggleProduct(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const field = str(form, "field");
  if (field !== "isActive" && field !== "isFeatured") backWith(LIST, "error", "Unknown setting.");
  const product = await db.product.findUnique({ where: { id } });
  if (!product) backWith(LIST, "error", "Product not found.");
  const value = !product[field];
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { [field]: value } });
    await audit(tx, { actorId: admin.id, action: "PRODUCT_UPDATED", entityType: "Product", entityId: id, previousValue: { [field]: !value }, newValue: { [field]: value } });
  });
  revalidateShopProduct(product.slug);
  const label = field === "isActive" ? (value ? "is now live in the shop" : "is hidden from the shop") : value ? "is featured on the homepage" : "is no longer featured";
  backWith(LIST, "ok", `${product.name} ${label}.`);
}

export async function deleteProduct(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const product = await db.product.findUnique({ where: { id }, include: { variants: { include: { _count: { select: { orderItems: true } } } } } });
  if (!product) backWith(LIST, "error", "Product not found.");
  const hasOrders = product.variants.some((v) => v._count.orderItems > 0);

  await db.$transaction(async (tx) => {
    if (hasOrders) {
      await tx.product.update({ where: { id }, data: { isActive: false, isFeatured: false } });
      await tx.productVariant.updateMany({ where: { productId: id }, data: { isAvailable: false } });
    } else {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    }
    await audit(tx, {
      actorId: admin.id,
      action: hasOrders ? "PRODUCT_DEACTIVATED" : "PRODUCT_DELETED",
      entityType: "Product",
      entityId: id,
      previousValue: { name: product.name, slug: product.slug },
    });
  });
  revalidateShopProduct(product.slug);
  backWith(
    LIST,
    "ok",
    hasOrders
      ? `${product.name} has past orders, so it can’t be deleted. It has been hidden from the shop instead.`
      : `${product.name} was deleted.`,
  );
}

export type SaveState = { error?: string } | null;

export async function saveProductAction(productId: string | null, _prev: SaveState, form: FormData): Promise<SaveState> {
  const admin = await requireAdmin();
  let payload: unknown;
  try {
    payload = JSON.parse(str(form, "payload"));
  } catch {
    return { error: "The form could not be read. Please try again." };
  }
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path[0] === "variants" && typeof issue.path[1] === "number" ? ` (option ${issue.path[1] + 1})` : "";
    return { error: `${issue?.message ?? "Please check the form."}${where}` };
  }

  let result;
  try {
    result = await saveProduct(admin.id, parsed.data, productId ?? undefined);
  } catch (err) {
    if (err instanceof ProductSaveError) return { error: err.message };
    throw err;
  }
  revalidateShopProduct(result.slug);
  const msg = [`${parsed.data.name} was saved.`, ...result.notices].join(" ");
  redirect(`${LIST}?ok=${encodeURIComponent(msg)}`);
}

function revalidateShopProduct(slug: string) {
  for (const p of ["/", "/products", "/impact", `/products/${slug}`]) revalidatePath(p);
}
