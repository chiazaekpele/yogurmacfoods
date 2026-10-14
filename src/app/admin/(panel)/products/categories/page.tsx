import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/admin/Flash";
import { PageHead } from "@/components/admin/PageHead";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { addCategory, deleteCategory, moveCategory, saveCategory } from "./actions";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/products/categories">) {
  await requireAdmin();
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="stack">
      <div className="small">
        <Link href="/admin/products">← Products & boxes</Link>
      </div>
      <PageHead
        title="Categories"
        lede="How products are grouped in the shop. Box categories sell tiers with listed contents, can be delivered daily, and count towards the Ythirst boxes counter."
      />
      <Flash searchParams={searchParams} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name and type</th>
              <th className="num">Products</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <form action={saveCategory} className="row" style={{ flexWrap: "wrap" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name" type="text" defaultValue={c.name} maxLength={60} required aria-label="Category name" style={{ maxWidth: 260 }} />
                    <label className="check">
                      <input type="checkbox" name="isBox" defaultChecked={c.isBox} /> Boxes with tiers
                    </label>
                    <SubmitButton className="btn btn-sm btn-ghost">Save</SubmitButton>
                  </form>
                </td>
                <td className="num">{c._count.products}</td>
                <td>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <form action={moveCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="dir" value="up" />
                      <SubmitButton className="btn btn-sm btn-ghost" pendingText="…" disabled={i === 0}>
                        Up
                      </SubmitButton>
                    </form>
                    <form action={moveCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="dir" value="down" />
                      <SubmitButton className="btn btn-sm btn-ghost" pendingText="…" disabled={i === categories.length - 1}>
                        Down
                      </SubmitButton>
                    </form>
                  </div>
                </td>
                <td>
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton className="btn btn-sm btn-danger" pendingText="…" disabled={c._count.products > 0} confirm={`Remove the ${c.name} category?`}>
                      Remove
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={addCategory} className="card">
        <h2 className="h2">Add a category</h2>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor="new-name">Name</label>
            <input id="new-name" name="name" type="text" maxLength={60} required placeholder="e.g. Breakfast Packages" />
          </div>
          <label className="check" style={{ paddingBottom: 10 }}>
            <input type="checkbox" name="isBox" /> Boxes with tiers
          </label>
          <SubmitButton pendingText="Adding…">Add category</SubmitButton>
        </div>
      </form>
    </div>
  );
}
