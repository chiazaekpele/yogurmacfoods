import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { StatusBadge } from "@/components/Status";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/lagos-time";
import { formatNaira } from "@/lib/money";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/order-status";
import { nextAdminStatus, previousStatus, whatsappDeliveryLink } from "@/lib/orders";
import { requireRole } from "@/lib/session";
import { moveOrder } from "./actions";
import { resendConfirmation } from "../../dashboard/actions";

export const metadata: Metadata = { title: "Order" };

const SETBACK_LABELS = { INGREDIENT_SHORTAGE: "Ingredient shortage", EQUIPMENT_ISSUE: "Equipment issue", PACKAGING_ISSUE: "Packaging issue", OTHER: "Other" } as const;

function describe(action: string, prev: unknown, next: unknown): string {
  const p = (prev ?? {}) as { status?: keyof typeof STATUS_LABELS };
  const n = (next ?? {}) as { status?: keyof typeof STATUS_LABELS; reason?: string; via?: string };
  if (action === "ORDER_CREATED") return "Order placed and paid";
  if (action === "ORDER_STATUS_CHANGED" && n.status) return `${n.via === "claim" ? "Claimed for production" : `Moved to ${STATUS_LABELS[n.status]}`}${p.status ? ` (from ${STATUS_LABELS[p.status]})` : ""}`;
  if (action === "ORDER_STATUS_REVERTED" && n.status) return `Moved back to ${STATUS_LABELS[n.status]}: “${n.reason}”`;
  if (action === "ORDER_EMAIL_RESENT") return "Confirmation email resent";
  return action.replace(/_/g, " ").toLowerCase();
}

export default async function OrderDetail({ params, searchParams }: PageProps<"/admin/orders/[orderId]">) {
  await requireRole("ADMIN");
  const { orderId } = await params;
  const order = await db.order.findUnique({
    where: { orderId: decodeURIComponent(orderId) },
    include: {
      items: true,
      claim: { include: { staff: { select: { name: true } } } },
      setbacks: { orderBy: { createdAt: "desc" }, include: { staff: { select: { name: true } } } },
    },
  });
  if (!order) notFound();

  const history = await db.auditLog.findMany({ where: { entityType: "Order", entityId: order.id }, orderBy: { createdAt: "asc" } });
  const actorIds = [...new Set(history.map((h) => h.actorId).filter((x): x is string => !!x))];
  const actors = new Map((await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));

  const next = nextAdminStatus(order.status);
  const back = previousStatus(order.status);
  const reached = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="stack">
      <div className="small">
        <Link href="/admin/orders">← All orders</Link>
      </div>
      <PageHead eyebrow={`Placed ${formatDateTime(order.createdAt)}`} title={order.orderId}>
        <StatusBadge status={order.status} />
      </PageHead>
      <Flash searchParams={searchParams} />

      <div className="steps" aria-label="Order progress">
        {STATUS_ORDER.map((s, i) => (
          <div key={s} className={`step ${i < reached ? "done" : i === reached ? "now" : ""}`}>
            {STATUS_LABELS[s]}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="h2">Update status</h2>
        {order.status === "CONFIRMED" && <p className="muted">Waiting in the production queue for a staff member to claim it.</p>}
        {order.status === "IN_PRODUCTION" && <p className="muted">Being made by {order.claim?.staff.name ?? "a staff member"}. They will mark it ready.</p>}
        <div className="row" style={{ marginTop: 10 }}>
          {next && (
            <form action={moveOrder}>
              <input type="hidden" name="orderId" value={order.orderId} />
              <input type="hidden" name="from" value={order.status} />
              <input type="hidden" name="to" value={next} />
              <SubmitButton pendingText="Updating…">Move to {STATUS_LABELS[next]}</SubmitButton>
            </form>
          )}
          {order.status === "OUT_FOR_DELIVERY" && (
            <a className="btn btn-gold" href={whatsappDeliveryLink(order)} target="_blank" rel="noopener noreferrer">
              Send WhatsApp Delivery Notice
            </a>
          )}
        </div>
        {back && (
          <details style={{ marginTop: 16 }}>
            <summary className="small">Made a mistake? Move back to {STATUS_LABELS[back]}</summary>
            <form action={moveOrder} style={{ marginTop: 10 }}>
              <input type="hidden" name="orderId" value={order.orderId} />
              <input type="hidden" name="from" value={order.status} />
              <input type="hidden" name="to" value={back} />
              <div className="field">
                <label htmlFor="reason">Reason (kept in the order history)</label>
                <input id="reason" name="reason" type="text" required maxLength={500} />
              </div>
              <div style={{ marginTop: 10 }}>
                <SubmitButton className="btn btn-ghost" pendingText="Updating…">
                  Move back
                </SubmitButton>
              </div>
            </form>
          </details>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h2">Customer</h2>
          <p>
            <strong>{order.customerName}</strong>
          </p>
          <p>
            <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a> · <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
          </p>
          <p style={{ marginTop: 8 }}>
            {order.exactAddress}
            {order.landmark && <span className="muted"> (near {order.landmark})</span>}
            <br />
            {order.lga}
          </p>
          <p className="small muted" style={{ marginTop: 8 }}>
            Confirmation email: {order.emailSent ? "sent" : order.emailError ? `failed (${order.emailError})` : "not sent yet"}
          </p>
          {!order.emailSent && (
            <form action={resendConfirmation} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="back" value={`/admin/orders/${order.orderId}`} />
              <SubmitButton className="btn btn-sm btn-ghost" pendingText="Sending…">
                Resend email
              </SubmitButton>
            </form>
          )}
        </div>
        <div className="card">
          <h2 className="h2">Payment</h2>
          <div className="row-between">
            <span>Subtotal</span>
            <span>{formatNaira(order.subtotal.toString())}</span>
          </div>
          <div className="row-between">
            <span>Delivery ({order.lga})</span>
            <span>{formatNaira(order.shippingFee.toString())}</span>
          </div>
          <div className="row-between" style={{ fontWeight: 700, borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}>
            <span>Total</span>
            <span>{formatNaira(order.total.toString())}</span>
          </div>
          <div className="row-between small muted">
            <span>Paid via Paystack</span>
            <span>{formatNaira(order.amountPaid.toString())}</span>
          </div>
          <p className="small muted mono" style={{ marginTop: 6 }}>
            Ref {order.paystackRef}
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Flavour</th>
              <th>Size</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">Line total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.productName}</td>
                <td>{i.flavour}</td>
                <td>{i.size}</td>
                <td className="num">{i.quantity}</td>
                <td className="num">{formatNaira(i.unitPrice.toString())}</td>
                <td className="num">{formatNaira(i.unitPrice.mul(i.quantity).toString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h2">Production notes</h2>
          {order.setbacks.length === 0 && <p className="muted">No setbacks reported.</p>}
          {order.setbacks.map((s) => (
            <div key={s.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <strong>{SETBACK_LABELS[s.category]}</strong> · {s.staff.name} <span className="small muted">{formatDateTime(s.createdAt)}</span>
              <div className="pre">{s.description}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="h2">History</h2>
          <ul className="timeline">
            {history.map((h) => (
              <li key={h.id}>
                <div>{describe(h.action, h.previousValue, h.newValue)}</div>
                <div className="small muted">
                  {formatDateTime(h.createdAt)} · {h.actorId ? (actors.get(h.actorId) ?? "Former user") : "System"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
