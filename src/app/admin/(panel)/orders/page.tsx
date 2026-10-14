import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { PageHead } from "@/components/admin/PageHead";
import { StatusBadge } from "@/components/admin/Status";
import { db } from "@/lib/db";
import { addDays, formatDateTime, lagosDayStart } from "@/lib/lagos-time";
import { LAGOS_LGAS } from "@/lib/lgas";
import { formatNaira } from "@/lib/money";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/admin/order-status";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 25;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const parseDay = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null);

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = one(sp.status) as OrderStatus | "";
  const lga = one(sp.lga);
  const q = one(sp.q).slice(0, 100);
  const from = parseDay(one(sp.from));
  const to = parseDay(one(sp.to));
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (STATUS_ORDER.includes(status as OrderStatus)) where.status = status as OrderStatus;
  if ((LAGOS_LGAS as readonly string[]).includes(lga)) where.lga = lga;
  if (from || to) where.createdAt = { ...(from ? { gte: lagosDayStart(from) } : {}), ...(to ? { lt: lagosDayStart(addDays(to, 1)) } : {}) };
  if (q) {
    const digits = q.replace(/\D/g, "");
    where.OR = [
      { orderId: { contains: q.toUpperCase() } },
      { customerName: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 4 ? [{ customerPhone: { contains: digits.replace(/^0/, "") } }] : []),
    ];
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: { select: { productName: true, flavour: true, size: true, quantity: true, days: true } } },
    }),
    db.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const u = new URLSearchParams(Object.entries({ status, lga, q, from: one(sp.from), to: one(sp.to) }).filter(([, v]) => v) as [string, string][]);
    u.set("page", String(p));
    return `/admin/orders?${u}`;
  };

  return (
    <div>
      <PageHead title="Orders" lede={`${total} order${total === 1 ? "" : "s"}${q || status || lga || from || to ? " match your filters" : ""}.`} />

      <form className="filters" role="search">
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Order ID, customer name or phone" />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="">All</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lga">LGA</label>
          <select id="lga" name="lga" defaultValue={lga}>
            <option value="">All</option>
            {LAGOS_LGAS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={one(sp.from)} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={one(sp.to)} />
        </div>
        <div className="row">
          <button className="btn">Filter</button>
          <Link className="btn btn-ghost" href="/admin/orders">
            Clear
          </Link>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>LGA</th>
              <th>Items</th>
              <th className="num">Total</th>
              <th>Status</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono">
                  <Link href={`/admin/orders/${o.orderId}`}>{o.orderId}</Link>
                </td>
                <td>{o.customerName}</td>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{o.customerPhone}</td>
                <td>{o.lga}</td>
                <td className="small">
                  {o.items.map((i) => `${i.quantity}× ${i.productName} (${i.flavour}, ${i.size})${i.days > 1 ? `, daily ×${i.days} days` : ""}`).join("; ")}
                </td>
                <td className="num">{formatNaira(o.total.toString())}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="row-between" style={{ marginTop: 14 }}>
          <span className="small muted">
            Page {page} of {pages}
          </span>
          <div className="row">
            {page > 1 && (
              <Link className="btn btn-ghost btn-sm" href={link(page - 1)}>
                ← Newer
              </Link>
            )}
            {page < pages && (
              <Link className="btn btn-ghost btn-sm" href={link(page + 1)}>
                Older →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
