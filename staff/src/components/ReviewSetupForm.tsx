"use client";

import { useActionState, useState } from "react";
import { saveReviewSetup, type ReviewSetupState } from "@/app/admin/reviews/actions";

type Q = { key: string; questionText: string; expectedOutcome: string; isLongAnswer: boolean };
const CADENCES = [
  ["DAILY", "Daily"],
  ["WEEKLY", "Weekly"],
  ["BIWEEKLY", "Every two weeks"],
  ["MONTHLY", "Monthly"],
] as const;
let n = 0;
const k = () => `q${n++}`;

export function ReviewSetupForm({ cadence: initialCadence, questions: initial }: { cadence: string; questions: Omit<Q, "key">[] }) {
  const [state, action, pending] = useActionState<ReviewSetupState, FormData>(saveReviewSetup, null);
  const [cadence, setCadence] = useState(initialCadence);
  const [qs, setQs] = useState<Q[]>(initial.map((q) => ({ ...q, key: k() })));
  const update = (i: number, patch: Partial<Q>) => setQs(qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: number) => {
    const next = [...qs];
    const [m] = next.splice(i, 1);
    next.splice(i + d, 0, m);
    setQs(next);
  };

  return (
    <form action={action} className="stack">
      <input type="hidden" name="payload" value={JSON.stringify({ cadence, questions: qs.map(({ key: _k, ...q }) => q) })} />
      {state?.error && (
        <div className="form-err" role="alert">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="form-ok" role="status">
          {state.ok}
        </div>
      )}

      <div className="card">
        <div className="field" style={{ maxWidth: 300 }}>
          <label htmlFor="cadence">How often staff check in</label>
          <select id="cadence" value={cadence} onChange={(e) => setCadence(e.target.value)}>
            {CADENCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {qs.map((q, i) => (
        <div className="card" key={q.key}>
          <div className="row-between">
            <h2 className="h2" style={{ margin: 0 }}>
              Question {i + 1}
            </h2>
            <div className="row">
              <button type="button" className="btn btn-sm btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move question ${i + 1} up`}>
                ↑
              </button>
              <button type="button" className="btn btn-sm btn-ghost" disabled={i === qs.length - 1} onClick={() => move(i, 1)} aria-label={`Move question ${i + 1} down`}>
                ↓
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => setQs(qs.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor={`text-${q.key}`}>Question</label>
            <input id={`text-${q.key}`} type="text" required maxLength={500} value={q.questionText} onChange={(e) => update(i, { questionText: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor={`exp-${q.key}`}>Expected outcome (only you see this)</label>
            <textarea id={`exp-${q.key}`} required maxLength={1000} value={q.expectedOutcome} onChange={(e) => update(i, { expectedOutcome: e.target.value })} style={{ minHeight: 70 }} />
          </div>
          <div className="field">
            <label htmlFor={`type-${q.key}`}>Answer</label>
            <select id={`type-${q.key}`} value={q.isLongAnswer ? "long" : "short"} onChange={(e) => update(i, { isLongAnswer: e.target.value === "long" })} style={{ maxWidth: 220 }}>
              <option value="short">Short answer</option>
              <option value="long">Long answer</option>
            </select>
          </div>
        </div>
      ))}

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => setQs([...qs, { key: k(), questionText: "", expectedOutcome: "", isLongAnswer: true }])}>
          Add question
        </button>
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save check-in"}
        </button>
      </div>
      <p className="hint">If anyone has already answered this period, your changes start with the next one.</p>
    </form>
  );
}
