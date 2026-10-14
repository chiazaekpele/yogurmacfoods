"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { backWith, firstError, requiredText, str } from "@/lib/admin/forms";
import { uniqueSlug } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";

const PATH = "/admin/products/categories";
const schema = z.object({ name: requiredText(60, "Category name"), isBox: z.boolean() });

function done(message: string): never {
  for (const p of ["/", "/products", "/impact"]) revalidatePath(p);
  backWith(PATH, "ok", message);
}

async function nameTaken(name: string, exceptId?: string) {
  const other = await db.category.findFirst({ where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
  return !!other;
}

export async function addCategory(form: FormData) {
  const admin = await requireAdmin();
  const parsed = schema.safeParse({ name: str(form, "name"), isBox: form.get("isBox") === "on" });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  const { name, isBox } = parsed.data;
  if (await nameTaken(name)) backWith(PATH, "error", `There is already a category called ${name}.`);
  const slug = await uniqueSlug(async (s) => !!(await db.category.findUnique({ where: { slug: s } })), name, "category");
  await db.$transaction(async (tx) => {
    const last = await tx.category.aggregate({ _max: { sortOrder: true } });
    const cat = await tx.category.create({ data: { name, slug, isBox, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    await audit(tx, { actorId: admin.id, action: "CATEGORY_CREATED", entityType: "Category", entityId: cat.id, newValue: { name, isBox } });
  });
  done(`${name} added. Choose it when you add a product.`);
}

export async function saveCategory(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const parsed = schema.safeParse({ name: str(form, "name"), isBox: form.get("isBox") === "on" });
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  const { name, isBox } = parsed.data;
  const before = await db.category.findUnique({ where: { id } });
  if (!before) backWith(PATH, "error", "That category no longer exists.");
  if (await nameTaken(name, id)) backWith(PATH, "error", `There is already a category called ${name}.`);
  await db.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data: { name, isBox } });
    await audit(tx, { actorId: admin.id, action: "CATEGORY_UPDATED", entityType: "Category", entityId: id, previousValue: { name: before.name, isBox: before.isBox }, newValue: { name, isBox } });
  });
  done(`${name} saved.`);
}

export async function moveCategory(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const all = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const i = all.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) backWith(PATH, "ok", "Order unchanged.");
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((c, k) => db.category.update({ where: { id: c.id }, data: { sortOrder: k + 1 } })));
  done("Order updated. The shop’s category filters follow this order.");
}

export async function deleteCategory(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const cat = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!cat) backWith(PATH, "ok", "Category removed.");
  if (cat._count.products > 0) {
    backWith(PATH, "error", `${cat.name} still has ${cat._count.products} product${cat._count.products === 1 ? "" : "s"}. Move or delete them first.`);
  }
  await db.$transaction(async (tx) => {
    await tx.category.delete({ where: { id } });
    await audit(tx, { actorId: admin.id, action: "CATEGORY_DELETED", entityType: "Category", entityId: id, previousValue: { name: cat.name } });
  });
  done(`${cat.name} removed.`);
}
