import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/PageHead";
import { StatusBadge } from "@/components/admin/Status";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/lagos-time";
import { formatNaira, fromKobo, toKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetail({ params }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: { select: { productName: true, flavour: true, size: true, quantity: true, days: true, variant: { select: { product: { select: { category: true } } } } } } },
      },
    },
  });
  if (!customer) notFound();

  const spentKobo = customer.orders.reduce((sum, o) => sum + toKobo(o.total), 0);
  // Each day of a daily box counts as one box, as on the shop's counter.
  const boxes = customer.orders
    .flatMap((o) => o.items)
    .filter((i) => i.variant.product.category === "WELLNESS_BOX")
    .reduce((n, i) => n + i.quantity * i.days, 0);

  return (
    <div className="stack">
      <div className="small">
        <Link href="/admin/customers">← All customers</Link>
      </div>
      <PageHead eyebrow={`Customer since ${formatDate(customer.createdAt)}`} title={customer.name} />

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-label">Orders</div>
          <div className="stat-value">{customer.orders.length}</div>
        </div>
        <div className="card">
          <div className="stat-label">Total spent</div>
          <div className="stat-value">{formatNaira(fromKobo(spentKobo))}</div>
        </div>
        <div className="card">
          <div className="stat-label">Wellness boxes</div>
          <div className="stat-value">{boxes}</div>
        </div>
        <div className="card">
          <div className="stat-label">Last order</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{customer.orders[0] ? formatDate(customer.orders[0].createdAt) : "None yet"}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Contact and saved delivery details</h2>
        <p>
          <a href={`mailto:${customer.email}`}>{customer.email}</a>
          {customer.phone && (
            <>
              {" "}
              · <a href={`tel:${customer.phone}`}>{customer.phone}</a>
            </>
          )}
        </p>
        <p style={{ marginTop: 8 }}>
          {customer.exactAddress || customer.lga ? (
            <>
              {customer.exactAddress}
              {customer.landmark && <span className="muted"> (near {customer.landmark})</span>}
              {customer.exactAddress && <br />}
              {customer.lga}
            </>
          ) : (
            <span className="muted">No delivery address saved yet.</span>
          )}
        </p>
      </div>

      <div>
        <h2 className="h2">Order history</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Items</th>
                <th>Delivered to</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">
                    <Link href={`/admin/orders/${o.orderId}`}>{o.orderId}</Link>
                  </td>
                  <td className="small">
                    {o.items.map((i) => `${i.quantity}× ${i.productName} (${i.flavour}, ${i.size})${i.days > 1 ? `, daily ×${i.days} days` : ""}`).join("; ")}
                  </td>
                  <td className="small">{o.lga}</td>
                  <td className="num">{formatNaira(o.total.toString())}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
              {customer.orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
