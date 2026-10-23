import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReviewForm } from "@/components/ReviewForm";
import { requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Write a review", robots: { index: false } };

export default async function ReviewPage({ params }: PageProps<"/account/review/[orderId]">) {
  const { orderId } = await params;
  const customer = await requireCustomer(`/account/review/${orderId}`);
  const order = await db.order.findUnique({
    where: { orderId },
    include: { items: { select: { productName: true, quantity: true } }, review: { select: { id: true } } },
  });
  if (!order || order.customerId !== customer.id) notFound();
  if (order.review) redirect("/account?notice=review");

  const [first, ...rest] = customer.name.trim().split(/\s+/);
  const defaultName = rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;

  return (
    <>
      <div className="page-head">
        <span className="kicker">Order {order.orderId}</span>
        <h1 className="page-h1">How was your order?</h1>
        <p className="page-lede">{order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</p>
      </div>
      <section className="section">
        <div style={{ maxWidth: 640 }}>
          {order.status === "DELIVERED" ? (
            <ReviewForm orderId={order.orderId} defaultName={defaultName} />
          ) : (
            <p className="lead">
              You can review this order once it has been delivered. <Link className="link" href="/account">Back to your account</Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
