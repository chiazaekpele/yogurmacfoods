"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNaira } from "@/lib/money";
import { openPaystack } from "@/lib/paystack-inline";
import { fieldErrors, subscribeSchema } from "@/lib/validation";

type Tier = { id: string; name: string; description: string; monthlyAmount: string };

export function SubscribeForm({ tiers, simulated }: { tiers: Tier[]; simulated: boolean }) {
  const router = useRouter();
  const [tierId, setTierId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tier = tiers.find((t) => t.id === tierId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = { tierId: tierId ?? "", subscriberName: name, subscriberEmail: email };
    const parsed = subscribeSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (data.mode === "simulated") return router.push(data.payUrl);
      const result = await openPaystack("", data.accessCode);
      if (result === "success") router.push(`/partner/thank-you?tier=${encodeURIComponent(tier?.name ?? "")}`);
      else setFormError("Payment was not completed. You can try again.");
    } catch {
      setFormError("Payment is temporarily unavailable. Please try again in a few minutes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="tiers">
        {tiers.map((t) => (
          <div className="tier" key={t.id} data-selected={t.id === tierId}>
            <div className="tier-nm">{t.name}</div>
            <div className="tier-amt">
              {formatNaira(t.monthlyAmount)} <span>/ month</span>
            </div>
            <p className="tier-ds">{t.description}</p>
            <button
              className={t.id === tierId ? "btn" : "btn btn-ghost"}
              onClick={() => {
                setTierId(t.id);
                setErrors({});
                document.getElementById("subscribe-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {t.id === tierId ? "Selected" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>

      {tier && (
        <form id="subscribe-form" className="section" onSubmit={submit} noValidate style={{ maxWidth: 560 }}>
          <h2 className="section-h2">
            {tier.name} — {formatNaira(tier.monthlyAmount)}/month
          </h2>
          {formError && (
            <div className="form-err" role="alert">
              {formError}
            </div>
          )}
          <div className="field">
            <label htmlFor="subscriberName">Full name</label>
            <input id="subscriberName" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.subscriberName || undefined} />
            {errors.subscriberName && <span className="field-err">{errors.subscriberName}</span>}
          </div>
          <div className="field">
            <label htmlFor="subscriberEmail">Email address</label>
            <input id="subscriberEmail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.subscriberEmail || undefined} />
            {errors.subscriberEmail && <span className="field-err">{errors.subscriberEmail}</span>}
          </div>
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? "Please wait…" : `Give ${formatNaira(tier.monthlyAmount)} monthly`}
          </button>
          <p className="field-hint" style={{ marginTop: 10 }}>
            {simulated ? "Local test mode: payment is simulated. No real money is charged." : "Secure monthly billing via Paystack."}
          </p>
        </form>
      )}
    </>
  );
}
