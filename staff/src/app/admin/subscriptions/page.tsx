import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, SubscriptionStatus } from "@/generated/prisma/client";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/lagos-time";
import { formatNaira } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { createTier, toggleTier, updateTier } from "./actions";

export const metadata: Metadata = { title: "Partners" };

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "CANCELLED", "EXPIRED"];
const STATUS_LABEL = { ACTIVE: "Active", CANCELLED: "Cancelled", EXPIRED: "Expired" } as const;

export default async function SubscriptionsPage({ searchParams }: PageProps<"/admin/subscriptions">) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const tierId = typeof sp.tier === "string" ? sp.tier : "";
  const status = (typeof sp.status === "string" ? sp.status : "ACTIVE") as SubscriptionStatus | "ALL";

  const where: Prisma.SubscriptionWhereInput = {};
  if (tierId) where.tierId = tierId;
  if (STATUSES.includes(status as SubscriptionStatus)) where.status = status as SubscriptionStatus;

  const [tiers, subs] = await Promise.all([
    db.subscriptionTier.findMany({
      orderBy: [{ sortOrder: "asc" }, { monthlyAmount: "asc" }],
      include: { _count: { select: { subscriptions: true } }, subscriptions: { where: { status: "ACTIVE" }, select: { id: true } } },
    }),
    db.subscription.findMany({ where, orderBy: { startDate: "desc" }, take: 200, include: { tier: { select: { name: true, monthlyAmount: true } } } }),
  ]);

  return (
    <div className="stack">
      <PageHead title="Partners" lede="Monthly donation tiers for the Ythirst project, and the people giving through them." />
      <Flash searchParams={searchParams} />

      <h2 className="h2">Tiers</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th className="num">Monthly</th>
              <th className="num">Active partners</th>
              <th>On shop</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.name}</strong>
                  <div className="small muted">{t.description}</div>
                  <details style={{ marginTop: 8 }}>
                    <summary className="small">Edit</summary>
                    <form action={updateTier} style={{ marginTop: 8, maxWidth: 420 }}>
                      <input type="hidden" name="id" value={t.id} />
                      <div className="field">
                        <label htmlFor={`name-${t.id}`}>Name</label>
                        <input id={`name-${t.id}`} name="name" type="text" defaultValue={t.name} required maxLength={80} />
                      </div>
                      <div className="field">
                        <label htmlFor={`desc-${t.id}`}>Description</label>
                        <input id={`desc-${t.id}`} name="description" type="text" defaultValue={t.description} required maxLength={400} />
                      </div>
                      <div className="field">
                        <label htmlFor={`amt-${t.id}`}>Monthly amount (₦)</label>
                        <input
                          id={`amt-${t.id}`}
                          name="monthlyAmount"
                          type="number"
                          min="100"
                          step="0.01"
                          defaultValue={t.monthlyAmount.toString()}
                          disabled={t._count.subscriptions > 0}
                        />
                        {t._count.subscriptions > 0 && <span className="hint">Locked: this tier has partners.</span>}
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <SubmitButton className="btn btn-sm">Save tier</SubmitButton>
                      </div>
                    </form>
                  </details>
                </td>
                <td className="num">{formatNaira(t.monthlyAmount.toString())}</td>
                <td className="num">{t.subscriptions.length}</td>
                <td>
                  <span className={`badge ${t.isActive ? "b-on" : "b-off"}`}>{t.isActive ? "Showing" : "Hidden"}</span>
                </td>
                <td>
                  <form action={toggleTier}>
                    <input type="hidden" name="id" value={t.id} />
                    <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                      {t.isActive ? "Hide" : "Show"}
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="card">
        <summary>Create a new tier</summary>
        <form action={createTier} style={{ marginTop: 12, maxWidth: 480 }}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required maxLength={80} placeholder="e.g. Seed Partner" />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" type="text" required maxLength={400} />
          </div>
          <div className="field">
            <label htmlFor="monthlyAmount">Monthly amount (₦)</label>
            <input id="monthlyAmount" name="monthlyAmount" type="number" min="100" step="0.01" required />
            <span className="hint">This creates a monthly plan in Paystack. It can’t be changed once someone subscribes.</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <SubmitButton pendingText="Creating plan…">Create tier</SubmitButton>
          </div>
        </form>
      </details>

      <div>
        <h2 className="h2">Partners</h2>
        <form className="filters">
          <div className="field">
            <label htmlFor="tier">Tier</label>
            <select id="tier" name="tier" defaultValue={tierId}>
              <option value="">All tiers</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={status}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
              <option value="ALL">All</option>
            </select>
          </div>
          <button className="btn">Filter</button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Tier</th>
                <th className="num">Monthly</th>
                <th>Started</th>
                <th>Next payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/subscriptions/${s.id}`}>{s.subscriberName}</Link>
                    <div className="small muted">{s.subscriberEmail}</div>
                  </td>
                  <td>{s.tier.name}</td>
                  <td className="num">{formatNaira(s.tier.monthlyAmount.toString())}</td>
                  <td className="small">{formatDate(s.startDate)}</td>
                  <td className="small">{s.nextPaymentDate ? formatDate(s.nextPaymentDate) : "—"}</td>
                  <td>
                    <span className={`badge ${s.status === "ACTIVE" ? "b-on" : "b-off"}`}>{STATUS_LABEL[s.status]}</span>
                    {s.endsAtPeriodEnd && s.status === "ACTIVE" && <div className="small muted">Ends after this period</div>}
                    {s.lastPaymentFailedAt && <div className="small" style={{ color: "var(--red)" }}>Payment failed {formatDate(s.lastPaymentFailedAt)}</div>}
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No partners match.
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
