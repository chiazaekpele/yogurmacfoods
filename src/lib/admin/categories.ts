import { db } from "@/lib/db";
import type { CategoryOption } from "./product-meta";

export async function listCategoryOptions(): Promise<CategoryOption[]> {
  return db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, isBox: true } });
}
