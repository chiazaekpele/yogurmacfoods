import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/Flash";
import { OrderItems } from "@/components/OrderItems";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateTime } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";
import { activeClaim, orderForStaff } from "@/lib/staff-orders";
import { claim, ready, reportSetback } from "../actions";

export const metadata: Metadata = { title: "Order" };

const CATEGORIES = [
  ["INGREDIENT_SHORTAGE", "Ingredient shortage"],
  ["EQUIPMENT_ISSUE", "Equipment issue"],
  ["PACKAGING_ISSUE", "Packaging issue"],
  ["OTHER", "Other"],
] as const;
const LABEL = Object.fromEntries(CATEGORIES) as Record<string, string>;

export default async function StaffOrderPage({ params, searchParams }: PageProps<"/staff/queue/[orderId]">) {
  const staff = await requireRole("STAFF");
  const { orderId } = await params;
  const order = await orderForStaff(decodeURIComponent(orderId), staff.id);
  if (!order) notFound();
  const busy = !order.mine && !!(await activeClaim(staff.id));

  return (
    <div className="stack">
      <div className="small">
        <Link href="/staff/queue">← Production queue</Link>
      </div>
      <PageHead eyebrow={order.mine ? "You’re making this" : `Ordered ${formatDateTime(order.createdAt)}`} title={order.orderId} />
      <Flash searchParams={searchParams} />

      <div className="card">
        <h2 className="h2">To make</h2>
        <OrderItems items={order.items} />
      </div>

      {order.mine ? (
        <>
          <form action={ready}>
            <input type="hidden" name="orderId" value={order.orderId} />
            <SubmitButton className="btn btn-gold" pendingText="Updating…" confirm="Is everything made and packed?">
              Mark as ready
            </SubmitButton>
          </form>

          <details className="card">
            <summary>Report a setback</summary>
            <p className="hint" style={{ margin: "6px 0 10px" }}>
              The owner will see this on the order. Keep working; the order stays with you.
            </p>
            <form action={reportSetback}>
              <input type="hidden" name="orderId" value={order.orderId} />
              <div className="field">
                <label htmlFor="category">What happened</label>
                <select id="category" name="category" required defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {CATEGORIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="description">Details</label>
                <textarea id="description" name="description" required maxLength={2000} />
              </div>
              <div style={{ marginTop: 12 }}>
                <SubmitButton pendingText="Sending…">Submit setback</SubmitButton>
              </div>
            </form>
          </details>

          {order.setbacks.length > 0 && (
            <div>
              <h2 className="h2">Your setback reports</h2>
              {order.setbacks.map((s) => (
                <div key={s.id} className="card" style={{ marginBottom: 8 }}>
                  <strong>{LABEL[s.category]}</strong> <span className="small muted">{formatDateTime(s.createdAt)}</span>
                  <p className="pre">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <form action={claim}>
          <input type="hidden" name="orderId" value={order.orderId} />
          <SubmitButton pendingText="Claiming…" disabled={busy}>
            Claim order
          </SubmitButton>
          {busy && <p className="hint" style={{ marginTop: 6 }}>Mark your current order as Ready before claiming another.</p>}
        </form>
      )}
    </div>
  );
}
