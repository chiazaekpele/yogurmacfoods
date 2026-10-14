"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type FormState, requestReset, resetPassword, saveDetails, signIn, signUp } from "@/app/account/actions";
import { LAGOS_LGAS } from "@/lib/lgas";

function Messages({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <div className="form-err" role="alert">
        {state.error}
      </div>
    );
  if (state?.ok)
    return (
      <div className="form-ok" role="status">
        {state.ok}
      </div>
    );
  return null;
}

function Field({
  name,
  label,
  state,
  hint,
  ...input
}: { name: string; label: string; state: FormState; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state?.fields?.[name];
  // After a submission, show what was typed (React clears the form otherwise).
  const value = state?.values?.[name];
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input {...input} key={value === undefined ? "initial" : `v:${value}`} id={name} name={name} defaultValue={value ?? input.defaultValue} aria-invalid={err ? true : undefined} aria-describedby={err ? `${name}-err` : hint ? `${name}-hint` : undefined} />
      {hint && !err && (
        <span className="field-hint" id={`${name}-hint`}>
          {hint}
        </span>
      )}
      {err && (
        <span className="field-err" id={`${name}-err`}>
          {err}
        </span>
      )}
    </div>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, null);
  return (
    <form action={action} noValidate>
      <Messages state={state} />
      <input type="hidden" name="next" value={next} />
      <Field name="email" label="Email address" type="email" autoComplete="email" required state={state} />
      <Field name="password" label="Password" type="password" autoComplete="current-password" required state={state} />
      <p className="small" style={{ margin: "-6px 0 18px" }}>
        <Link className="link" href="/account/forgot">
          Forgot your password?
        </Link>
      </p>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, null);
  return (
    <form action={action} noValidate>
      <Messages state={state} />
      <input type="hidden" name="next" value={next} />
      <Field name="name" label="Full name" autoComplete="name" required state={state} />
      <Field name="email" label="Email address" type="email" autoComplete="email" required state={state} hint="Order confirmations are sent here." />
      <Field name="password" label="Password" type="password" autoComplete="new-password" required minLength={8} state={state} hint="At least 8 characters." />
      <Field name="confirm" label="Confirm password" type="password" autoComplete="new-password" required state={state} />
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestReset, null);
  return (
    <form action={action} noValidate>
      <Messages state={state} />
      <Field name="email" label="Email address" type="email" autoComplete="email" required state={state} />
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, null);
  return (
    <form action={action} noValidate>
      <Messages state={state} />
      <input type="hidden" name="token" value={token} />
      <Field name="password" label="New password" type="password" autoComplete="new-password" required minLength={8} state={state} hint="At least 8 characters." />
      <Field name="confirm" label="Confirm new password" type="password" autoComplete="new-password" required state={state} />
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

type Details = { name: string; phone: string; lga: string; exactAddress: string; landmark: string };

export function DetailsForm({ initial, email }: { initial: Details; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDetails, null);
  const err = (k: string) => state?.fields?.[k];
  return (
    <form action={action} noValidate>
      <Messages state={state} />
      <Field name="name" label="Full name" autoComplete="name" defaultValue={initial.name} state={state} />
      <div className="field">
        <label htmlFor="acct-email">Email address</label>
        <input id="acct-email" value={email} readOnly disabled />
      </div>
      <Field name="phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" defaultValue={initial.phone} state={state} hint="Our rider will call this number." />
      <div className="field">
        <label htmlFor="lga">Local government area (LGA)</label>
        <select id="lga" name="lga" key={state?.values?.lga ?? "initial"} defaultValue={state?.values?.lga ?? initial.lga} aria-invalid={err("lga") ? true : undefined}>
          <option value="">Choose your LGA</option>
          {LAGOS_LGAS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        {err("lga") && <span className="field-err">{err("lga")}</span>}
      </div>
      <Field name="exactAddress" label="Delivery address" autoComplete="street-address" placeholder="House number, street, area" defaultValue={initial.exactAddress} state={state} />
      <Field name="landmark" label="Nearby landmark (optional)" defaultValue={initial.landmark} state={state} />
      <button className="btn" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
