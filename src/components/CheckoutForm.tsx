"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { daysOf, lineKey, useCart } from "@/hooks/useCart";
import { formatNaira, fromKobo, toKobo, vatKobo } from "@/lib/money";
import { openPaystack } from "@/lib/paystack-inline";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { Naira } from "./Naira";

type Lga = { name: string; fee: string | null };

const EMPTY_FORM = { customerName: "", customerPhone: "", customerEmail: "", lga: "", exactAddress: "", landmark: "" };

export function CheckoutForm({
  lgas,
  simulated,
  initial,
  vatRate,
  pickup,
}: {
  lgas: Lga[];
  simulated: boolean;
  initial?: Partial<typeof EMPTY_FORM>;
  // VAT added on top, in percent (0 = none).
  vatRate: number;
  // Offered when the owner has set a pickup address.
  pickup: { address: string; note: string | null } | null;
}) {
  const router = useRouter();
  const { items, subtotalKobo, reprice } = useCart();
  // Pre-filled from the signed-in customer's saved details.
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [fulfilment, setFulfilment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const isPickup = fulfilment === "PICKUP";

  // Same sums as the server quote: delivery charged once per order, VAT on top.
  const fee = lgas.find((l) => l.name === form.lga)?.fee;
  const shippingKobo = !isPickup && fee ? toKobo(fee) : 0;
  const vat = vatKobo(subtotalKobo + shippingKobo, vatRate);
  const totalKobo = subtotalKobo + shippingKobo + vat;

  if (!items.length) {
    return (
      <div className="empty">
        <p style={{ marginBottom: 16 }}>Your cart is empty.</p>
        <Link className="btn" href="/products">
          Browse products
        </Link>
      </div>
    );
  }

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    const payload = {
      ...form,
      fulfilment,
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, days: daysOf(i) })),
      expectedTotalKobo: totalKobo,
      acceptTerms,
    };
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError("Please check the highlighted fields.");
      return;
    }
    if (!isPickup && form.lga && !fee) {
      setErrors({ lga: `Delivery to ${form.lga} is not available yet.` });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.priceChanged) {
        reprice(Object.fromEntries((data.lines as { variantId: string; unitPrice: string }[]).map((l) => [l.variantId, l.unitPrice])));
        setNotice(`${data.error} New total: ${formatNaira(data.total)}. Press “Place order & pay” again to continue.`);
        return;
      }
      if (res.status === 401 && data.signIn) {
        router.push("/account/sign-up?next=/checkout");
        return;
      }
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.mode === "simulated") {
        router.push(data.payUrl);
        return;
      }

      // Paystack inline checkout. The order is created by the webhook, not here.
      const result = await openPaystack(data.accessCode);
      if (result === "success") router.push(data.orderUrl);
      else setFormError("Payment was not completed. Your details are saved — you can try again.");
    } catch {
      setFormError("Payment is temporarily unavailable. Please try again in a few minutes.");
    } finally {
      setBusy(false);
    }
  }

  const err = (key: string) =>
    errors[key] ? (
      <span className="field-err" id={`${key}-err`}>
        {errors[key]}
      </span>
    ) : null;
  const aria = (key: string) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-err` : undefined,
  });

  return (
    <form className="two-col" onSubmit={submit} noValidate>
      <div className="main">
        {formError && (
          <div className="form-err" role="alert">
            {formError}
          </div>
        )}
        {notice && (
          <div className="form-ok" role="status">
            {notice}
          </div>
        )}

        <fieldset className="fieldset">
          <legend>Your details</legend>
          <div className="field">
            <label htmlFor="customerName">Full name</label>
            <input id="customerName" autoComplete="name" value={form.customerName} onChange={set("customerName")} {...aria("customerName")} />
            {err("customerName")}
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="customerPhone">Phone number</label>
              <input
                id="customerPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0803 123 4567"
                value={form.customerPhone}
                onChange={set("customerPhone")}
                {...aria("customerPhone")}
              />
              <span className="field-hint">Our rider will call this number.</span>
              {err("customerPhone")}
            </div>
            <div className="field">
              <label htmlFor="customerEmail">Email address</label>
              <input id="customerEmail" type="email" autoComplete="email" value={form.customerEmail} onChange={set("customerEmail")} {...aria("customerEmail")} />
              <span className="field-hint">For your order confirmation.</span>
              {err("customerEmail")}
            </div>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>{pickup ? "Delivery or pickup" : "Delivery"}</legend>
          {pickup && (
            <div className="opt-row" role="radiogroup" aria-label="How you get your order" style={{ marginBottom: 18 }}>
              {(["DELIVERY", "PICKUP"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  className="opt"
                  aria-checked={fulfilment === f}
                  aria-pressed={fulfilment === f}
                  onClick={() => {
                    setFulfilment(f);
                    setErrors({});
                  }}
                >
                  {f === "DELIVERY" ? "Deliver to me" : "I’ll pick it up"}
                </button>
              ))}
            </div>
          )}
          {isPickup && pickup ? (
            <div className="pickup-box">
              <strong>Pick up from</strong>
              <p>{pickup.address}</p>
              {pickup.note && <p className="field-hint">{pickup.note}</p>}
              <p className="field-hint">We’ll message you when your order is ready to collect. No delivery fee.</p>
            </div>
          ) : (
          <>
          <div className="field">
            <label htmlFor="lga">Local government area (LGA)</label>
            <select id="lga" value={form.lga} onChange={set("lga")} {...aria("lga")}>
              <option value="">Select your LGA</option>
              {lgas.map((l) => (
                <option key={l.name} value={l.name} disabled={!l.fee}>
                  {l.name}
                  {l.fee ? ` — ${formatNaira(l.fee)}` : " — not available yet"}
                </option>
              ))}
            </select>
            {err("lga")}
          </div>
          <div className="field">
            <label htmlFor="exactAddress">Exact address</label>
            <input
              id="exactAddress"
              autoComplete="street-address"
              placeholder="House number, street, area"
              value={form.exactAddress}
              onChange={set("exactAddress")}
              {...aria("exactAddress")}
            />
            {err("exactAddress")}
          </div>
          <div className="field">
            <label htmlFor="landmark">Nearby landmark (optional)</label>
            <input id="landmark" value={form.landmark} onChange={set("landmark")} {...aria("landmark")} />
            {err("landmark")}
          </div>
          </>
          )}
          {err("fulfilment")}
        </fieldset>
      </div>

      <div className="aside summary">
        <h2>Order summary</h2>
        <div className="sum-items">
          {items.map((i) => (
            <div key={lineKey(i)}>
              <span>
                {i.quantity} × {i.productName} ({i.flavour}, {i.size}){daysOf(i) > 1 ? `, daily for ${daysOf(i)} days` : ""}
              </span>
              <span>{formatNaira(fromKobo(toKobo(i.unitPrice) * i.quantity * daysOf(i)))}</span>
            </div>
          ))}
        </div>
        {err("items")}
        <div className="sum-row">
          <span>Subtotal</span>
          <span>{formatNaira(fromKobo(subtotalKobo))}</span>
        </div>
        <div className="sum-row">
          {isPickup ? (
            <>
              <span>Pickup</span>
              <span>Free</span>
            </>
          ) : (
            <>
              <span>Delivery{form.lga ? ` (${form.lga})` : ""}</span>
              <span>{fee ? formatNaira(fee) : "Select LGA"}</span>
            </>
          )}
        </div>
        {vatRate > 0 && (
          <div className="sum-row">
            <span>VAT ({vatRate}%)</span>
            <span>{formatNaira(fromKobo(vat))}</span>
          </div>
        )}
        <div className="sum-row total">
          <span>Total</span>
          <span>
            <Naira value={fromKobo(totalKobo)} />
          </span>
        </div>
        <label className="terms-check">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => {
              setAcceptTerms(e.target.checked);
              if (errors.acceptTerms) setErrors(({ acceptTerms: _, ...rest }) => rest);
            }}
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "acceptTerms-err" : undefined}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" target="_blank">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {err("acceptTerms")}
        <button className="btn btn-block" type="submit" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? "Please wait…" : "Place order & pay"}
        </button>
        <p className="field-hint" style={{ marginTop: 10 }}>
          {simulated
            ? "Local test mode: payment is simulated. No real money is charged."
            : "Secure payment by card or bank transfer via Paystack."}
        </p>
      </div>
    </form>
  );
}
