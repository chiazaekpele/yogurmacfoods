"use client";

import { useActionState, useState } from "react";
import { type FormState, writeReview } from "@/app/account/actions";

export function ReviewForm({ orderId, defaultName }: { orderId: string; defaultName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(writeReview.bind(null, orderId), null);
  const [rating, setRating] = useState(Number(state?.values?.rating) || 0);
  const err = (k: string) =>
    state?.fields?.[k] ? (
      <span className="field-err" id={`${k}-err`}>
        {state.fields[k]}
      </span>
    ) : null;

  return (
    <form action={action} noValidate>
      {state?.error && (
        <div className="form-err" role="alert">
          {state.error}
        </div>
      )}
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="field">
        <span className="opt-label" id="rating-label">
          Your rating
        </span>
        <div className="star-pick" role="radiogroup" aria-labelledby="rating-label">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} className={n <= rating ? "on" : ""} onClick={() => setRating(n)}>
              ★
            </button>
          ))}
        </div>
        {err("rating")}
      </div>
      <div className="field">
        <label htmlFor="body">Your review</label>
        <textarea id="body" name="body" rows={5} maxLength={1000} defaultValue={state?.values?.body} key={state?.values?.body ?? "b"} placeholder="What did you enjoy? How was the delivery?" />
        {err("body")}
      </div>
      <div className="field">
        <label htmlFor="displayName">Name shown with your review</label>
        <input id="displayName" name="displayName" maxLength={60} defaultValue={state?.values?.displayName ?? defaultName} key={state?.values?.displayName ?? "n"} />
        {err("displayName")}
      </div>
      <button className="btn" disabled={pending}>
        {pending ? "Sending…" : "Send review"}
      </button>
    </form>
  );
}
