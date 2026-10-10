"use client";

import { useActionState } from "react";
import { acceptInvite, type InviteState } from "./actions";

export function InviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(acceptInvite.bind(null, token), null);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="stack">
      {state?.error && (
        <div className="form-err" role="alert">
          {state.error}
        </div>
      )}
      <div>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={!!f.password} aria-describedby="password-hint" />
          <span className="hint" id="password-hint">
            At least 10 characters.
          </span>
          {f.password && <span className="err">{f.password}</span>}
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!f.confirm} />
          {f.confirm && <span className="err">{f.confirm}</span>}
        </div>
      </div>
      <button className="btn btn-block" disabled={pending}>
        {pending ? "Setting up…" : "Set password and sign in"}
      </button>
    </form>
  );
}
