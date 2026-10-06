"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SimulatedPay({ body, cancelHref }: { body: Record<string, string>; cancelHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <button
        className="btn btn-gold"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch("/api/dev/simulate-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) router.push(data.redirect);
          else {
            setError(data.error ?? "Simulation failed");
            setBusy(false);
          }
        }}
      >
        {busy ? "Processing…" : "Simulate successful payment"}
      </button>
      <Link className="btn btn-ghost" href={cancelHref}>
        Cancel
      </Link>
      {error && <span className="field-err">{error}</span>}
    </div>
  );
}
