"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { adminSignIn, adminSignUp, type AuthState } from "./actions";

function Field({ name, label, type = "text", state, auto }: { name: string; label: string; type?: string; state: AuthState; auto?: string }) {
  const err = state?.fields?.[name];
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {type === "password" ? (
        <PasswordInput id={name} name={name} autoComplete={auto} aria-invalid={err ? true : undefined} aria-describedby={err ? `${name}-err` : undefined} required />
      ) : (
        <input
          key={state?.values?.[name] ?? ""}
          id={name}
          name={name}
          type={type}
          autoComplete={auto}
          defaultValue={state?.values?.[name]}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${name}-err` : undefined}
          required
        />
      )}
      {err && (
        <span className="err" id={`${name}-err`}>
          {err}
        </span>
      )}
    </div>
  );
}

export function SignInForm({ signUpOpen }: { signUpOpen: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(adminSignIn, null);
  return (
    <form action={action} className="stack" noValidate>
      {state?.error && (
        <div className="form-err" role="alert">
          {state.error}
        </div>
      )}
      <div>
        <Field name="email" label="Email" type="email" auto="email" state={state} />
        <Field name="password" label="Password" type="password" auto="current-password" state={state} />
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Signing in…" : "Login"}
      </button>
      {signUpOpen && (
        <p className="small muted" style={{ textAlign: "center" }}>
          New admin with a sign-up code? <Link href="/admin/sign-up" className="link">Create an account</Link>
        </p>
      )}
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(adminSignUp, null);
  return (
    <form action={action} className="stack" noValidate>
      {state?.error && (
        <div className="form-err" role="alert">
          {state.error}
        </div>
      )}
      <div>
        <Field name="name" label="Full name" auto="name" state={state} />
        <Field name="email" label="Email" type="email" auto="email" state={state} />
        <Field name="password" label="Password (at least 10 characters)" type="password" auto="new-password" state={state} />
        <Field name="confirm" label="Confirm password" type="password" auto="new-password" state={state} />
        <Field name="code" label="Sign-up code" type="password" auto="off" state={state} />
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Creating account…" : "Create admin account"}
      </button>
      <p className="small muted" style={{ textAlign: "center" }}>
        Already an admin? <Link href="/admin" className="link">Login</Link>
      </p>
    </form>
  );
}
