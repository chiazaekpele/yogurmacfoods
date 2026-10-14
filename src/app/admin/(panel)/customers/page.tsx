import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { PageHead } from "@/components/admin/PageHead";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/lagos-time";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 25;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 100);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    const digits = q.replace(/\D/g, "");
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 4 ? [{ phone: { contains: digits.replace(/^0/, "") } }] : []),
    ];
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.customer.count({ where }),
  ]);
  const stats = await db.order.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customers.map((c) => c.id) } },
    _count: true,
    _sum: { total: true },
    _max: { createdAt: true },
  });
  const byCustomer = new Map(stats.map((s) => [s.customerId, s]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div>
      <PageHead title="Customers" lede={`${total} customer account${total === 1 ? "" : "s"}${q ? " match your search" : ""}.`} />

      <form className="filters" role="search">
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Name, email or phone" />
        </div>
        <div className="row">
          <button className="btn">Search</button>
          <Link className="btn btn-ghost" href="/admin/customers">
            Clear
          </Link>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Phone</th>
              <th>LGA</th>
              <th className="num">Orders</th>
              <th className="num">Total spent</th>
              <th>Last order</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const s = byCustomer.get(c.id);
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/customers/${c.id}`}>{c.name}</Link>
                  </td>
                  <td className="small">{c.email}</td>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{c.phone ?? "–"}</td>
                  <td>{c.lga ?? "–"}</td>
                  <td className="num">{s?._count ?? 0}</td>
                  <td className="num">{formatNaira(s?._sum.total?.toString() ?? "0")}</td>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{s?._max.createdAt ? formatDateTime(s._max.createdAt) : "–"}</td>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDate(c.createdAt)}</td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No customers found.
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
