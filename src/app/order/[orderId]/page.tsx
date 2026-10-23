import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCart, OrderPending } from "@/components/OrderPending";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { ORDER_ID_PATTERN } from "@/lib/order-id";
import { isValidOrderToken } from "@/lib/order-link";
import { confirmFromPaystack } from "@/lib/webhooks";
import { Naira } from "@/components/Naira";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[orderId]">) {
  const { orderId } = await params;
  if (!ORDER_ID_PATTERN.test(orderId)) notFound();
  const showAddress = isValidOrderToken(orderId, (await searchParams).t);

  let order = await db.order.findUnique({ where: { orderId }, include: { items: true } });
  // Back from Paystack before the webhook: check the payment directly.
  if (!order && (await confirmFromPaystack(orderId))) order = await db.order.findUnique({ where: { orderId }, include: { items: true } });

  if (!order) {
    // The browser can arrive before Paystack's webhook has created the order.
    const pending = await db.pendingCheckout.findUnique({ where: { orderId }, select: { id: true } });
    if (!pending) notFound();
    return (
      <div className="confirm">
        <ClearCart />
        <OrderPending orderId={orderId} />
      </div>
    );
  }

  return (
    <div className="confirm">
      <ClearCart />
      <div className="eyebrow">Thank you</div>
      <h1 className="page-h1">Your order has been received</h1>
      <div className="order-id">{order.orderId}</div>
      <p className="prose">
        You will receive a confirmation email shortly. We will notify you when your order is{" "}
        {order.fulfilment === "PICKUP" ? "ready to collect" : "on its way"}.
      </p>
      <div className="fresh-note" style={{ margin: "18px 0" }}>
        Made fresh to order
      </div>

      <div className="summary">
        <h2>Summary</h2>
        <div className="sum-items">
          {order.items.map((i) => (
            <div key={i.id}>
              <span>
                {i.quantity} × {i.productName} ({i.flavour}, {i.size}){i.days > 1 ? `, daily for ${i.days} days` : ""}
              </span>
              <span>{formatNaira(i.unitPrice.mul(i.quantity * i.days).toString())}</span>
            </div>
          ))}
        </div>
        <div className="sum-row">
          <span>Subtotal</span>
          <span>{formatNaira(order.subtotal.toString())}</span>
        </div>
        <div className="sum-row">
          {order.fulfilment === "PICKUP" ? (
            <>
              <span>Pickup</span>
              <span>Free</span>
            </>
          ) : (
            <>
              <span>Delivery ({order.lga})</span>
              <span>{formatNaira(order.shippingFee.toString())}</span>
            </>
          )}
        </div>
        {order.vat.gt(0) && (
          <div className="sum-row">
            <span>VAT ({order.vatRate.toNumber()}%)</span>
            <span>{formatNaira(order.vat.toString())}</span>
          </div>
        )}
        <div className="sum-row total">
          <span>Total paid</span>
          <span>
            <Naira value={order.amountPaid.toString()} />
          </span>
        </div>
        {order.fulfilment === "PICKUP" ? (
          <p style={{ fontSize: 14, marginTop: 14 }}>
            <strong>Pick up from:</strong> {order.exactAddress}
          </p>
        ) : showAddress && (
          <p style={{ fontSize: 14, marginTop: 14 }}>
            <strong>Delivering to:</strong> {order.exactAddress}
            {order.landmark ? ` (near ${order.landmark})` : ""}, {order.lga}
          </p>
        )}
      </div>

      <p style={{ marginTop: 24 }}>
        <Link className="btn btn-ghost" href="/products">
          Continue shopping
        </Link>
      </p>
    </div>
  );
}
