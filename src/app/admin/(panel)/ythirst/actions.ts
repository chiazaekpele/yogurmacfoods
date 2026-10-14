"use server";

import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { backWith } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/admin/session";
import { revalidatePath } from "next/cache";

const PATH = "/admin/ythirst";
const value = z.coerce.number().int("Use whole numbers.").min(0).max(100_000_000);

export async function saveImpact(form: FormData) {
  const admin = await requireAdmin();
  const stats = await db.impactStat.findMany();
  const changes: { id: string; key: string; from: number; to: number }[] = [];
  for (const s of stats) {
    const parsed = value.safeParse(form.get(s.key));
    if (!parsed.success) backWith(PATH, "error", `${s.label}: enter a whole number.`);
    if (parsed.data !== s.value) changes.push({ id: s.id, key: s.key, from: s.value, to: parsed.data });
  }
  if (!changes.length) backWith(PATH, "ok", "Nothing changed.");
  await db.$transaction(async (tx) => {
    for (const c of changes) {
      await tx.impactStat.update({ where: { id: c.id }, data: { value: c.to } });
      await audit(tx, { actorId: admin.id, action: "IMPACT_STAT_UPDATED", entityType: "ImpactStat", entityId: c.id, previousValue: { [c.key]: c.from }, newValue: { [c.key]: c.to } });
    }
  });
  revalidatePath("/");
  revalidatePath("/impact");
  backWith(PATH, "ok", "Impact numbers saved. They now show on the shop.");
}
