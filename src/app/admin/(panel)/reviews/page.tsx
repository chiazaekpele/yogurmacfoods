import type { Metadata } from "next";
import Link from "next/link";
import type { CustomerReviewStatus } from "@/generated/prisma/client";
import { Flash } from "@/components/admin/Flash";
import { PageHead } from "@/components/admin/PageHead";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/lagos-time";
import { deleteReview, setReviewStatus } from "./actions";

export const metadata: Metadata = { title: "Reviews" };

const TABS: [CustomerReviewStatus, string][] = [
  ["PENDING", "Waiting for approval"],
  ["APPROVED", "On the shop"],
  ["HIDDEN", "Hidden"],
];

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "PENDING") as CustomerReviewStatus;
  const [reviews, counts] = await Promise.all([
    db.customerReview.findMany({
      where: { status: tab },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { order: { select: { orderId: true } }, customer: { select: { id: true, name: true } } },
    }),
    db.customerReview.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="stack">
      <PageHead title="Reviews" lede="Customers can review an order once it is delivered. Approved reviews show just above the footer on every page of the shop." />
      <Flash searchParams={searchParams} />

      <div className="row">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/reviews?tab=${k}`} className={`btn btn-sm ${tab === k ? "" : "btn-ghost"}`}>
            {label} ({count[k] ?? 0})
          </Link>
        ))}
      </div>

      {reviews.length === 0 && <p className="muted">No reviews here.</p>}
      {reviews.map((r) => (
        <div className="card" key={r.id}>
          <div className="row-between">
            <div>
              <span className="review-stars-admin" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
                <span aria-hidden>{"★".repeat(5 - r.rating)}</span>
              </span>{" "}
              <strong>{r.displayName}</strong>
            </div>
            <span className="small muted">{formatDateTime(r.createdAt)}</span>
          </div>
          <p style={{ margin: "10px 0", whiteSpace: "pre-wrap" }}>{r.body}</p>
          <div className="row-between">
            <span className="small muted">
              <Link href={`/admin/customers/${r.customer.id}`}>{r.customer.name}</Link> · order <Link href={`/admin/orders/${r.order.orderId}`}>{r.order.orderId}</Link>
            </span>
            <div className="row">
              {r.status !== "APPROVED" && (
                <form action={setReviewStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="APPROVED" />
                  <input type="hidden" name="tab" value={tab} />
                  <SubmitButton className="btn btn-sm" pendingText="…">
                    Approve
                  </SubmitButton>
                </form>
              )}
              {r.status !== "HIDDEN" && (
                <form action={setReviewStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="HIDDEN" />
                  <input type="hidden" name="tab" value={tab} />
                  <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                    Hide
                  </SubmitButton>
                </form>
              )}
              <form action={deleteReview}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="tab" value={tab} />
                <SubmitButton className="btn btn-sm btn-danger" pendingText="…" confirm="Delete this review? This can’t be undone.">
                  Delete
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
