"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { backWith, firstError, requiredText, str } from "@/lib/admin/forms";
import { isShopImage } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";

const PATH = "/admin/hero";

const slideSchema = z.object({
  alt: requiredText(200, "A description of the image"),
  href: z
    .string()
    .trim()
    .regex(/^\/(?!\/)[\w\-./#?=&%]*$/, "The link must be a page on this site, starting with /, e.g. /products or /impact."),
  position: z.string().trim().regex(/^[a-z0-9% ]{0,40}$/, "Choose a focus point."),
  fit: z.enum(["cover", "contain"]),
  background: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a background colour.")]),
});

function parseSlide(form: FormData) {
  return slideSchema.safeParse({
    alt: str(form, "alt"),
    href: str(form, "href") || "/products",
    position: str(form, "position"),
    fit: str(form, "fit") || "cover",
    background: str(form, "fit") === "contain" ? str(form, "background") : "",
  });
}

function done(message: string): never {
  revalidatePath("/");
  backWith(PATH, "ok", message);
}

export async function addSlide(form: FormData) {
  const admin = await requireAdmin();
  const imageUrl = str(form, "imageUrl");
  if (!isShopImage(imageUrl)) backWith(PATH, "error", "Upload an image first.");
  const parsed = parseSlide(form);
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  const d = parsed.data;
  await db.$transaction(async (tx) => {
    const last = await tx.heroSlide.aggregate({ _max: { sortOrder: true } });
    const slide = await tx.heroSlide.create({
      data: { imageUrl, alt: d.alt, href: d.href, position: d.position || null, fit: d.fit, background: d.background || null, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    });
    await audit(tx, { actorId: admin.id, action: "HERO_SLIDE_ADDED", entityType: "HeroSlide", entityId: slide.id, newValue: { imageUrl, alt: d.alt } });
  });
  done("Image added to the homepage.");
}

export async function saveSlide(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const parsed = parseSlide(form);
  if (!parsed.success) backWith(PATH, "error", firstError(parsed.error));
  const d = parsed.data;
  await db.$transaction(async (tx) => {
    await tx.heroSlide.update({ where: { id }, data: { alt: d.alt, href: d.href, position: d.position || null, fit: d.fit, background: d.background || null } });
    await audit(tx, { actorId: admin.id, action: "HERO_SLIDE_UPDATED", entityType: "HeroSlide", entityId: id, newValue: d });
  });
  done("Image saved.");
}

export async function toggleSlide(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const slide = await db.heroSlide.findUnique({ where: { id } });
  if (!slide) backWith(PATH, "error", "That image no longer exists.");
  if (slide.isActive && (await db.heroSlide.count({ where: { isActive: true } })) <= 1) {
    backWith(PATH, "error", "Keep at least one image showing on the homepage.");
  }
  await db.$transaction(async (tx) => {
    await tx.heroSlide.update({ where: { id }, data: { isActive: !slide.isActive } });
    await audit(tx, { actorId: admin.id, action: slide.isActive ? "HERO_SLIDE_HIDDEN" : "HERO_SLIDE_SHOWN", entityType: "HeroSlide", entityId: id });
  });
  done(slide.isActive ? "Image hidden from the homepage." : "Image is showing on the homepage.");
}

export async function moveSlide(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const slides = await db.heroSlide.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = slides.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= slides.length) backWith(PATH, "ok", "Order unchanged.");
  [slides[i], slides[j]] = [slides[j], slides[i]];
  await db.$transaction(slides.map((s, k) => db.heroSlide.update({ where: { id: s.id }, data: { sortOrder: k + 1 } })));
  done("Order updated.");
}

export async function deleteSlide(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const slide = await db.heroSlide.findUnique({ where: { id } });
  if (!slide) backWith(PATH, "ok", "Image removed.");
  if (slide.isActive && (await db.heroSlide.count({ where: { isActive: true } })) <= 1) {
    backWith(PATH, "error", "Keep at least one image showing on the homepage.");
  }
  await db.$transaction(async (tx) => {
    await tx.heroSlide.delete({ where: { id } });
    await audit(tx, { actorId: admin.id, action: "HERO_SLIDE_DELETED", entityType: "HeroSlide", entityId: id, previousValue: { imageUrl: slide.imageUrl, alt: slide.alt } });
  });
  done("Image removed from the homepage.");
}
