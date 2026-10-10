"use client";

import { useState, useTransition } from "react";
import { moveTask, raiseBlocker } from "@/app/staff/tasks/actions";

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  due: string | null;
  overdue: boolean;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  blockerNote: string | null;
};
type Col = "PENDING" | "IN_PROGRESS" | "COMPLETED";
const COLS: [Col, string][] = [
  ["PENDING", "Pending"],
  ["IN_PROGRESS", "In progress"],
  ["COMPLETED", "Completed"],
];
// Blocked tasks sit in the In progress column, flagged.
const colOf = (s: BoardTask["status"]): Col => (s === "BLOCKED" ? "IN_PROGRESS" : s);

export function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState<Col | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const move = (id: string, to: Col) =>
    start(async () => {
      setError(null);
      const r = await moveTask(id, to);
      if (r.error) setError(r.error);
    });
  const block = (id: string) =>
    start(async () => {
      setError(null);
      const r = await raiseBlocker(id, note);
      if (r.error) setError(r.error);
      else {
        setBlocking(null);
        setNote("");
      }
    });

  return (
    <div aria-busy={pending}>
      {error && (
        <div className="form-err" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div className="board">
        {COLS.map(([col, label]) => {
          const list = tasks.filter((t) => colOf(t.status) === col);
          return (
            <section
              key={col}
              className={`col ${over === col ? "drop" : ""}`}
              aria-label={label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                const t = tasks.find((x) => x.id === id);
                if (t && (colOf(t.status) !== col || t.status === "BLOCKED")) move(id, col);
              }}
            >
              <h2 className="h2">
                {label} <span className="muted">{list.length}</span>
              </h2>
              {list.map((t) => (
                <article key={t.id} className={`task ${t.status === "BLOCKED" ? "blocked" : ""}`} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}>
                  <h3>{t.title}</h3>
                  {t.description && <p className="small pre">{t.description}</p>}
                  {t.due && (
                    <p className="small" style={{ color: t.overdue ? "var(--red)" : "var(--muted)" }}>
                      Due {t.due}
                    </p>
                  )}
                  {t.status === "BLOCKED" && (
                    <p className="small" style={{ color: "var(--red)" }}>
                      Blocked: {t.blockerNote}
                    </p>
                  )}
                  <div className="row" style={{ marginTop: 8 }}>
                    {col !== "PENDING" && col !== "COMPLETED" && (
                      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => move(t.id, "PENDING")}>
                        ← Pending
                      </button>
                    )}
                    {col === "PENDING" && (
                      <button type="button" className="btn btn-sm" disabled={pending} onClick={() => move(t.id, "IN_PROGRESS")}>
                        Start
                      </button>
                    )}
                    {t.status === "BLOCKED" && (
                      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => move(t.id, "IN_PROGRESS")}>
                        Unblock
                      </button>
                    )}
                    {col === "IN_PROGRESS" && (
                      <button type="button" className="btn btn-sm" disabled={pending} onClick={() => move(t.id, "COMPLETED")}>
                        Done
                      </button>
                    )}
                    {col === "COMPLETED" && (
                      <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => move(t.id, "IN_PROGRESS")}>
                        Reopen
                      </button>
                    )}
                    {col !== "COMPLETED" && t.status !== "BLOCKED" && (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setBlocking(blocking === t.id ? null : t.id)}>
                        Raise blocker
                      </button>
                    )}
                  </div>
                  {blocking === t.id && (
                    <div style={{ marginTop: 10 }}>
                      <label htmlFor={`note-${t.id}`}>What’s stopping you?</label>
                      <textarea id={`note-${t.id}`} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 70 }} />
                      <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} disabled={pending || !note.trim()} onClick={() => block(t.id)}>
                        Send to owner
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {list.length === 0 && <p className="small muted" style={{ marginTop: 10 }}>Nothing here.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
