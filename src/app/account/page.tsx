import type { Metadata } from "next";
import Link from "next/link";
import { DetailsForm } from "@/components/AccountForms";
import { requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { orderPath } from "@/lib/order-link";
import { confirmFromPaystack } from "@/lib/webhooks";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account", robots: { index: false } };

const STATUS = { CONFIRMED: "Confirmed", IN_PRODUCTION: "Being made", READY: "Ready", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered" } as const;
const date = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

export default async function AccountPage() {
  const c = await requireCustomer("/account");
  // Payments from the last two days still waiting on Paystack's webhook.
  const waiting = await db.pendingCheckout.findMany({
    where: { customerId: c.id, consumedAt: null, createdAt: { gte: new Date(Date.now() - 2 * 86_400_000) } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { orderId: true },
  });
  await Promise.all(waiting.map((p) => confirmFromPaystack(p.orderId)));
  const orders = await db.order.findMany({
    where: { customerId: c.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { select: { quantity: true, productName: true, days: true } } },
  });

  return (
    <>
      <div className="page-head">
        <span className="kicker">My account</span>
        <h1 className="page-h1">Hello, {c.name.split(" ")[0]}</h1>
        <p className="page-lede">{c.email}</p>
        <form action={signOut} style={{ marginTop: 16 }}>
          <button className="btn btn-outline btn-sm">Sign out</button>
        </form>
      </div>

      <section className="section">
        <div className="account-grid">
          <div>
            <h2 className="section-h2">Your orders</h2>
            {orders.length === 0 ? (
              <p className="lead">
                No orders yet.{" "}
                <Link className="link" href="/products">
                  Browse products
                </Link>
              </p>
            ) : (
              <ul className="history">
                {orders.map((o) => (
                  <li key={o.id}>
                    <div>
                      <Link className="link" href={orderPath(o.orderId)}>
                        {o.orderId}
                      </Link>
                      <div className="small muted">
                        {date.format(o.createdAt)} · {o.items.map((i) => `${i.quantity}× ${i.productName}${i.days > 1 ? ` (${i.days} days)` : ""}`).join(", ")}
                      </div>
                    </div>
                    <div className="history-end">
                      <strong>{formatNaira(o.total.toString())}</strong>
                      <span className="status">{STATUS[o.status]}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

          </div>

          <aside className="summary">
            <h2>Saved details</h2>
            <p className="small muted" style={{ marginBottom: 16 }}>
              Filled in for you at checkout.
            </p>
            <DetailsForm
              email={c.email}
              initial={{ name: c.name, phone: c.phone ?? "", lga: c.lga ?? "", exactAddress: c.exactAddress ?? "", landmark: c.landmark ?? "" }}
            />
          </aside>
        </div>
      </section>
    </>
  );
}
