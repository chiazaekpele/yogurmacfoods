import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { PageHead } from "@/components/PageHead";
import { db } from "@/lib/db";
import { donationSummary } from "@/lib/donations";
import { formatDateTime } from "@/lib/lagos-time";
import { formatNaira } from "@/lib/money";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Donations" };

const PAGE_SIZE = 50;
const kids = (n: number) => `${n.toLocaleString("en-NG")} ${n === 1 ? "child" : "children"}`;

export default async function DonationsPage({ searchParams }: PageProps<"/admin/donations">) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const where: Prisma.DonationWhereInput = { status: "PAID" };
  if (q) {
    where.OR = [
      { reference: { contains: q.toUpperCase() } },
      { donorEmail: { contains: q.toLowerCase() } },
      { donorName: { contains: q, mode: "insensitive" } },
    ];
  }
  const [summary, list, total] = await Promise.all([
    donationSummary(),
    db.donation.findMany({ where, orderBy: { paidAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.donation.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/donations?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="stack">
      <PageHead title="Donations" lede="One-time gifts to the Ythirst project. Every ₦500 supports one child. This is the same total the shop’s live counter shows." />

      <div className="grid grid-3">
        {(
          [
            ["All time", summary.all],
            ["This year", summary.year],
            ["This month", summary.month],
          ] as const
        ).map(([label, t]) => (
          <div key={label} className={`card ${label === "All time" ? "card-dark" : ""}`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{kids(t.children)}</div>
            <div className="stat-sub" style={label === "All time" ? { color: "#CFC6B6" } : undefined}>
              {formatNaira(t.raised)} from {t.gifts} gift{t.gifts === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      <form className="filters" role="search">
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Name, email or reference" />
        </div>
        <div className="row">
          <button className="btn">Search</button>
          {q && (
            <Link className="btn btn-ghost" href="/admin/donations">
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Donor</th>
              <th className="num">Children</th>
              <th className="num">Amount</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{d.paidAt ? formatDateTime(d.paidAt) : "—"}</td>
                <td>
                  {d.donorName ?? <span className="muted">Anonymous</span>}
                  <div className="small muted">{d.donorEmail}</div>
                </td>
                <td className="num">{d.children.toLocaleString("en-NG")}</td>
                <td className="num">{formatNaira(d.amount.toString())}</td>
                <td className="mono">{d.reference}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {q ? "No donations match." : "No donations yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="row-between">
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
