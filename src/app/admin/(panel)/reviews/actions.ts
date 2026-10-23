"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/admin/audit";
import { backWith, str } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/admin/session";
import { clearChromeCache } from "@/lib/chrome-data";
import { db } from "@/lib/db";

const back = (form: FormData) => {
  const tab = str(form, "tab");
  return `/admin/reviews${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`;
};

function refreshShop() {
  clearChromeCache();
  // Reviews show above the footer on every page.
  revalidatePath("/", "layout");
}

export async function setReviewStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const status = str(form, "status");
  if (status !== "APPROVED" && status !== "HIDDEN") backWith(back(form), "error", "Unknown action.");
  const review = await db.customerReview.findUnique({ where: { id } });
  if (!review) backWith(back(form), "error", "That review no longer exists.");
  await db.$transaction(async (tx) => {
    await tx.customerReview.update({ where: { id }, data: { status } });
    await audit(tx, { actorId: admin.id, action: status === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_HIDDEN", entityType: "CustomerReview", entityId: id, previousValue: { status: review.status } });
  });
  refreshShop();
  backWith(back(form), "ok", status === "APPROVED" ? `Review by ${review.displayName} is now on the shop.` : `Review by ${review.displayName} is hidden.`);
}

export async function deleteReview(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const review = await db.customerReview.findUnique({ where: { id } });
  if (!review) backWith(back(form), "ok", "Review deleted.");
  await db.$transaction(async (tx) => {
    await tx.customerReview.delete({ where: { id } });
    await audit(tx, { actorId: admin.id, action: "REVIEW_DELETED", entityType: "CustomerReview", entityId: id, previousValue: { displayName: review.displayName, rating: review.rating, body: review.body } });
  });
  refreshShop();
  backWith(back(form), "ok", "Review deleted. The customer can write a new one for that order.");
}
