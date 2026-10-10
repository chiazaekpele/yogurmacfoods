import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { CATEGORY_LABELS } from "@/lib/products";
import { requireRole } from "@/lib/session";
import { deleteProduct, toggleProduct } from "./actions";

export const metadata: Metadata = { title: "Products" };

function Toggle({ id, field, on, label }: { id: string; field: string; on: boolean; label: string }) {
  return (
    <form action={toggleProduct}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <SubmitButton className={`btn btn-sm ${on ? "" : "btn-ghost"}`} pendingText="…">
        {on ? `${label}: on` : `${label}: off`}
      </SubmitButton>
    </form>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireRole("ADMIN");
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { variants: { select: { price: true, isAvailable: true } } },
  });

  return (
    <div>
      <PageHead title="Products" lede="Everything customers can buy. Hidden products disappear from the shop straight away.">
        <Link className="btn" href="/admin/products/new">
          Add product
        </Link>
      </PageHead>
      <Flash searchParams={searchParams} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="num">Variants</th>
              <th className="num">From</th>
              <th>In shop</th>
              <th>Featured</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const available = p.variants.filter((v) => v.isAvailable);
              const from = available.reduce<(typeof available)[number]["price"] | null>((m, v) => (m === null || v.price.lt(m) ? v.price : m), null);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="small muted">/{p.slug}</div>
                  </td>
                  <td>{CATEGORY_LABELS[p.category]}</td>
                  <td className="num">
                    {available.length}
                    {available.length !== p.variants.length && <span className="muted"> / {p.variants.length}</span>}
                  </td>
                  <td className="num">{from ? formatNaira(from.toString()) : "—"}</td>
                  <td>
                    <Toggle id={p.id} field="isActive" on={p.isActive} label="Live" />
                  </td>
                  <td>
                    <Toggle id={p.id} field="isFeatured" on={p.isFeatured} label="Featured" />
                  </td>
                  <td>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <Link className="btn btn-sm btn-ghost" href={`/admin/products/${p.id}/edit`}>
                        Edit
                      </Link>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton className="btn btn-sm btn-danger" pendingText="…" confirm={`Delete ${p.name}? This can’t be undone.`}>
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No products yet. Add your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
