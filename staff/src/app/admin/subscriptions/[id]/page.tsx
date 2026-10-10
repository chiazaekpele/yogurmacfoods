import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/lagos-time";
import { formatNaira, fromKobo, toKobo } from "@/lib/money";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Partner" };

export default async function SubscriberPage({ params }: PageProps<"/admin/subscriptions/[id]">) {
  await requireRole("ADMIN");
  const { id } = await params;
  const s = await db.subscription.findUnique({ where: { id }, include: { tier: true, payments: { orderBy: { paidAt: "desc" } } } });
  if (!s) notFound();
  const totalKobo = s.payments.filter((p) => p.status === "success").reduce((sum, p) => sum + toKobo(p.amount), 0);

  return (
    <div className="stack">
      <div className="small">
        <Link href="/admin/subscriptions">← Partners</Link>
      </div>
      <PageHead eyebrow={s.tier.name} title={s.subscriberName} lede={s.subscriberEmail} />
      <div className="grid grid-4">
        <div className="card">
          <div className="stat-label">Monthly</div>
          <div className="stat-value">{formatNaira(s.tier.monthlyAmount.toString())}</div>
        </div>
        <div className="card">
          <div className="stat-label">Given in total</div>
          <div className="stat-value">{formatNaira(fromKobo(totalKobo))}</div>
        </div>
        <div className="card">
          <div className="stat-label">Partner since</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{formatDate(s.startDate)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{s.status.toLowerCase()}</div>
          {s.nextPaymentDate && s.status === "ACTIVE" && <div className="stat-sub">Next payment {formatDate(s.nextPaymentDate)}</div>}
        </div>
      </div>
      <div>
        <h2 className="h2">Payment history</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th>Paystack reference</th>
              </tr>
            </thead>
            <tbody>
              {s.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td className="num">{formatNaira(p.amount.toString())}</td>
                  <td>{p.status}</td>
                  <td className="mono">{p.paystackRef}</td>
                </tr>
              ))}
              {s.payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    No payments recorded yet.
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
