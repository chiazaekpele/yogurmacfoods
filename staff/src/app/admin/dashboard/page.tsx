import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { StatusBadge } from "@/components/Status";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime, lagosDate, lagosDayStart } from "@/lib/lagos-time";
import { donationSummary } from "@/lib/donations";
import { formatNaira } from "@/lib/money";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/order-status";
import { requireRole } from "@/lib/session";
import { resendConfirmation, resolveAlert } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

const SETBACK_LABELS = { INGREDIENT_SHORTAGE: "Ingredient shortage", EQUIPMENT_ISSUE: "Equipment issue", PACKAGING_ISSUE: "Packaging issue", OTHER: "Other" } as const;

export default async function AdminDashboard({ searchParams }: PageProps<"/admin/dashboard">) {
  const admin = await requireRole("ADMIN");
  const today = lagosDate();
  const startOfToday = lagosDayStart(today);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [todayAgg, byStatus, giving, recent, failedEmails, alerts, onDuty, activeStaff, setbacks] = await Promise.all([
    db.order.aggregate({ where: { createdAt: { gte: startOfToday } }, _count: true, _sum: { total: true } }),
    db.order.groupBy({ by: ["status"], _count: true }),
    donationSummary(),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, orderId: true, customerName: true, lga: true, total: true, status: true, createdAt: true } }),
    // Give the webhook a few minutes to send before calling it failed.
    db.order.findMany({ where: { emailSent: false, createdAt: { lt: fiveMinutesAgo } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, orderId: true, customerEmail: true, emailError: true, createdAt: true } }),
    db.systemAlert.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.dailyLog.count({ where: { logDate: today } }),
    db.user.count({ where: { role: "STAFF", isActive: true } }),
    db.setbackReport.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { order: { select: { orderId: true } }, staff: { select: { name: true } } },
    }),
  ]);

  const statusCount = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

  return (
    <div className="stack">
      <PageHead eyebrow={`Welcome back, ${admin.name.split(" ")[0]}`} title="Today at Yogurmac" />
      <Flash searchParams={searchParams} />

      <div className="grid grid-4">
        <div className="card card-dark">
          <div className="stat-label">Orders today</div>
          <div className="stat-value">{todayAgg._count}</div>
          <div className="stat-sub" style={{ color: "#CFC6B6" }}>{formatNaira(todayAgg._sum.total?.toString() ?? "0")} revenue</div>
        </div>
        <Link href="/admin/donations" className="card" style={{ textDecoration: "none" }}>
          <div className="stat-label">Given this month</div>
          <div className="stat-value">{giving.month.children.toLocaleString("en-NG")}</div>
          <div className="stat-sub">children · {formatNaira(giving.month.raised)}</div>
        </Link>
        <div className="card">
          <div className="stat-label">Staff on duty</div>
          <div className="stat-value">
            {onDuty}
            <span className="muted" style={{ fontSize: 18 }}> / {activeStaff}</span>
          </div>
          <div className="stat-sub">daily logs submitted today</div>
        </div>
        <div className="card">
          <div className="stat-label">Needs attention</div>
          <div className="stat-value">{failedEmails.length + alerts.length}</div>
          <div className="stat-sub">failed emails and payment alerts</div>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Orders by status</h2>
        <div className="grid grid-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
          {STATUS_ORDER.map((s) => (
            <Link key={s} href={`/admin/orders?status=${s}`} style={{ textDecoration: "none" }}>
              <div className="stat-label">{STATUS_LABELS[s]}</div>
              <div className="stat-value">{statusCount[s] ?? 0}</div>
            </Link>
          ))}
        </div>
      </div>

      {(failedEmails.length > 0 || alerts.length > 0) && (
        <div className="card" style={{ borderColor: "var(--red)" }}>
          <h2 className="h2">Needs attention</h2>
          {failedEmails.map((o) => (
            <div key={o.id} className="row-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <strong>Confirmation email not sent</strong> for <Link href={`/admin/orders/${o.orderId}`}>{o.orderId}</Link> to {o.customerEmail}
                {o.emailError && <div className="small muted">{o.emailError}</div>}
              </div>
              <form action={resendConfirmation}>
                <input type="hidden" name="id" value={o.id} />
                <SubmitButton className="btn btn-sm" pendingText="Sending…">
                  Resend email
                </SubmitButton>
              </form>
            </div>
          ))}
          {alerts.map((a) => (
            <div key={a.id} className="row-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <span className="badge b-warn">{a.type.replace(/_/g, " ")}</span> <span className="small muted">{formatDateTime(a.createdAt)}</span>
                <div>{a.message}</div>
              </div>
              <form action={resolveAlert}>
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton className="btn btn-sm btn-ghost">Mark resolved</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}

      {setbacks.length > 0 && (
        <div className="card">
          <h2 className="h2">Setbacks this week</h2>
          {setbacks.map((s) => (
            <div key={s.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <Link href={`/admin/orders/${s.order.orderId}`}>{s.order.orderId}</Link> · {SETBACK_LABELS[s.category]} · {s.staff.name}{" "}
              <span className="small muted">{formatDateTime(s.createdAt)}</span>
              <div className="small">{s.description}</div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="row-between">
          <h2 className="h2">Recent orders</h2>
          <Link href="/admin/orders" className="small">
            All orders →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>LGA</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className="mono">
                    <Link href={`/admin/orders/${o.orderId}`}>{o.orderId}</Link>
                  </td>
                  <td>{o.customerName}</td>
                  <td>{o.lga}</td>
                  <td className="num">{formatNaira(o.total.toString())}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="small">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
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
