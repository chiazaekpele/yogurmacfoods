"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/admin/audit";
import { backWith, str } from "@/lib/admin/forms";
import { uniqueSlug } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/admin/session";
import { clearChromeCache } from "@/lib/chrome-data";
import { db } from "@/lib/db";
import { infoPageSchema } from "@/lib/info-pages";

const LIST = "/admin/pages";

function refreshShop(slug: string) {
  clearChromeCache();
  revalidatePath("/", "layout"); // footer links on every page
  revalidatePath(`/company/${slug}`);
}

export type PageSaveState = { error?: string } | null;

export async function savePage(pageId: string | null, _prev: PageSaveState, form: FormData): Promise<PageSaveState> {
  const admin = await requireAdmin();
  let payload: unknown;
  try {
    payload = JSON.parse(str(form, "payload"));
  } catch {
    return { error: "The form could not be read. Please try again." };
  }
  const parsed = infoPageSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path[0] === "blocks" && typeof issue.path[1] === "number" ? ` (section ${issue.path[1] + 1})` : "";
    return { error: `${issue?.message ?? "Please check the page."}${where}` };
  }
  const { title, intro, isPublished, blocks } = parsed.data;
  const data = { title, intro: intro || null, isPublished, blocks: blocks as unknown as Prisma.InputJsonValue };

  let slug: string;
  if (pageId) {
    const page = await db.infoPage.findUnique({ where: { id: pageId } });
    if (!page) return { error: "This page no longer exists." };
    slug = page.slug; // the web address stays the same so shared links keep working
    await db.$transaction(async (tx) => {
      await tx.infoPage.update({ where: { id: pageId }, data });
      await audit(tx, { actorId: admin.id, action: "PAGE_UPDATED", entityType: "InfoPage", entityId: pageId, newValue: { title, isPublished, sections: blocks.length } });
    });
  } else {
    slug = await uniqueSlug(async (s) => !!(await db.infoPage.findUnique({ where: { slug: s } })), title, "page");
    await db.$transaction(async (tx) => {
      const last = await tx.infoPage.aggregate({ _max: { sortOrder: true } });
      const page = await tx.infoPage.create({ data: { ...data, slug, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
      await audit(tx, { actorId: admin.id, action: "PAGE_CREATED", entityType: "InfoPage", entityId: page.id, newValue: { title, slug } });
    });
  }
  refreshShop(slug);
  redirect(`${LIST}?ok=${encodeURIComponent(`${title} was saved${isPublished ? " and is on the shop" : " as a draft"}.`)}`);
}

export async function deletePage(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const page = await db.infoPage.findUnique({ where: { id } });
  if (!page) backWith(LIST, "ok", "Page deleted.");
  await db.$transaction(async (tx) => {
    await tx.infoPage.delete({ where: { id } });
    await audit(tx, { actorId: admin.id, action: "PAGE_DELETED", entityType: "InfoPage", entityId: id, previousValue: { title: page.title, slug: page.slug } });
  });
  refreshShop(page.slug);
  backWith(LIST, "ok", `${page.title} was deleted.`);
}

export async function movePage(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? -1 : 1;
  const all = await db.infoPage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, slug: true } });
  const i = all.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) backWith(LIST, "ok", "Order unchanged.");
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((p, k) => db.infoPage.update({ where: { id: p.id }, data: { sortOrder: k + 1 } })));
  refreshShop(all[i].slug);
  backWith(LIST, "ok", "Order updated. The footer lists pages in this order.");
}
