"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { CONTACT_EMAIL } from "@/lib/site";

export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => clear(), [clear]);
  return null;
}

const POLL_MS = 2000;
const TIMEOUT_MS = 60_000;

// Polls until the webhook has created the order, then re-renders the page.
export function OrderPending({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const started = Date.now();
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/order-status/${orderId}`, { cache: "no-store" });
        const { state } = await res.json();
        if (state === "confirmed") return router.refresh();
      } catch {
        // network blip: keep polling
      }
      if (Date.now() - started > TIMEOUT_MS) return setTimedOut(true);
      setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [orderId, router]);

  if (timedOut) {
    return (
      <>
        <h1 className="page-h1">Your payment is being processed</h1>
        <div className="order-id">{orderId}</div>
        <p className="prose">
          You will receive an email shortly. If you do not, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your Order ID.
        </p>
      </>
    );
  }
  return (
    <>
      <h1 className="page-h1">We’re confirming your payment</h1>
      <div className="order-id">{orderId}</div>
      <div className="spinner" role="status" aria-label="Confirming payment" />
      <p className="prose">This usually takes a few seconds. Please keep this page open.</p>
    </>
  );
}
