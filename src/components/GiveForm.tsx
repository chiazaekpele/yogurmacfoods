"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNaira } from "@/lib/money";
import { openPaystack } from "@/lib/paystack-inline";
import { donateSchema, fieldErrors, MAX_CHILDREN_PER_GIFT } from "@/lib/validation";

const PER_CHILD = 500;
const PRESETS = [1, 2, 5, 10, 20];

export function GiveForm({ simulated }: { simulated: boolean }) {
  const router = useRouter();
  const [children, setChildren] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const amount = String(children * PER_CHILD);

  const setCount = (n: number) => {
    setChildren(Math.max(1, Math.min(MAX_CHILDREN_PER_GIFT, Math.floor(n) || 1)));
    if (errors.children) setErrors(({ children: _, ...rest }) => rest);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = { children, donorName: name, donorEmail: email };
    const parsed = donateSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/donate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (data.mode === "simulated") return router.push(data.payUrl);
      const result = await openPaystack("", data.accessCode);
      if (result === "success") router.push(`/partner/thank-you?ref=${data.reference}`);
      else setFormError("Payment was not completed. You can try again.");
    } catch {
      setFormError("Payment is temporarily unavailable. Please try again in a few minutes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="give" onSubmit={submit} noValidate>
      {formError && (
        <div className="form-err" role="alert">
          {formError}
        </div>
      )}
      <fieldset className="fieldset">
        <legend>How many children would you like to support?</legend>
        <p className="field-hint" style={{ marginBottom: 10 }}>
          Every ₦500 supports one child.
        </p>
        <div className="opt-row" role="group" aria-label="Quick choices">
          {PRESETS.map((n) => (
            <button key={n} type="button" className="opt" aria-pressed={children === n} onClick={() => setCount(n)}>
              {n} {n === 1 ? "child" : "children"}
            </button>
          ))}
        </div>
        <div className="qty" style={{ marginTop: 12 }}>
          <button type="button" aria-label="One fewer child" onClick={() => setCount(children - 1)} disabled={children <= 1}>
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CHILDREN_PER_GIFT}
            aria-label="Number of children"
            value={children}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          <button type="button" aria-label="One more child" onClick={() => setCount(children + 1)} disabled={children >= MAX_CHILDREN_PER_GIFT}>
            +
          </button>
        </div>
        {errors.children && <span className="field-err">{errors.children}</span>}
      </fieldset>

      <fieldset className="fieldset">
        <legend>Your details</legend>
        <div className="field">
          <label htmlFor="donorName">Name (optional)</label>
          <input id="donorName" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <span className="field-hint">Leave blank to give anonymously.</span>
        </div>
        <div className="field">
          <label htmlFor="donorEmail">Email address</label>
          <input
            id="donorEmail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.donorEmail) setErrors(({ donorEmail: _, ...rest }) => rest);
            }}
            aria-invalid={errors.donorEmail ? true : undefined}
            aria-describedby={errors.donorEmail ? "donorEmail-err" : "donorEmail-hint"}
          />
          <span className="field-hint" id="donorEmail-hint">
            For your receipt.
          </span>
          {errors.donorEmail && (
            <span className="field-err" id="donorEmail-err">
              {errors.donorEmail}
            </span>
          )}
        </div>
      </fieldset>

      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? "Please wait…" : `Give ${formatNaira(amount)}`}
      </button>
      <p className="field-hint" style={{ marginTop: 10 }}>
        {simulated ? "Local test mode: payment is simulated. No real money is charged." : "One-time gift, paid securely by card or bank transfer via Paystack."}
      </p>
    </form>
  );
}
