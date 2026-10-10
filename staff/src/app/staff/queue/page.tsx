import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/Flash";
import { OrderItems } from "@/components/OrderItems";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateTime } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";
import { activeClaim, listQueue } from "@/lib/staff-orders";
import { claim } from "./actions";

export const metadata: Metadata = { title: "Production queue" };

export default async function QueuePage({ searchParams }: PageProps<"/staff/queue">) {
  const staff = await requireRole("STAFF");
  const [queue, mine] = await Promise.all([listQueue(), activeClaim(staff.id)]);

  return (
    <div className="stack">
      <PageHead title="Production queue" lede="Oldest orders first. Claim one to start making it." />
      <Flash searchParams={searchParams} />

      {mine && (
        <div className="banner">
          <div>
            <strong>You’re making {mine.order.orderId}</strong>
            <div className="small">Mark your current order as Ready before claiming another.</div>
          </div>
          <Link className="btn" href={`/staff/queue/${mine.order.orderId}`}>
            Open my order
          </Link>
        </div>
      )}

      {queue.length === 0 && <div className="card empty">No orders waiting. Nice work.</div>}
      <div className="grid grid-2">
        {queue.map((o) => (
          <div className="card" key={o.id}>
            <div className="row-between">
              <Link href={`/staff/queue/${o.orderId}`} className="mono">
                {o.orderId}
              </Link>
              <span className="small muted">{formatDateTime(o.createdAt)}</span>
            </div>
            <div style={{ margin: "10px 0 14px" }}>
              <OrderItems items={o.items} />
            </div>
            <form action={claim}>
              <input type="hidden" name="orderId" value={o.orderId} />
              <SubmitButton className="btn btn-block" pendingText="Claiming…" disabled={!!mine}>
                Claim order
              </SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
