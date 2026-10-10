import type { Metadata } from "next";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime, formatDay, lagosDate } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";
import { saveLog } from "./actions";

export const metadata: Metadata = { title: "Daily log" };

export default async function LogPage({ searchParams }: PageProps<"/staff/log">) {
  const staff = await requireRole("STAFF");
  const today = lagosDate();
  const logs = await db.dailyLog.findMany({ where: { staffId: staff.id }, orderBy: { logDate: "desc" }, take: 30 });
  const todays = logs.find((l) => l.logDate.getTime() === today.getTime());
  const editable = !todays || todays.editableUntil > new Date();
  const past = logs.filter((l) => l !== todays);

  return (
    <div className="stack">
      <PageHead eyebrow={formatDay(today)} title="Daily log" lede="Anything you worked on today outside your orders and tasks." />
      <Flash searchParams={searchParams} />

      {editable ? (
        <form action={saveLog} className="card" style={{ maxWidth: 680 }}>
          <div className="field">
            <label htmlFor="activityText">What did you work on today?</label>
            <textarea id="activityText" name="activityText" required maxLength={5000} defaultValue={todays?.activityText ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="generalSetbacks">Any setbacks or observations? (optional)</label>
            <textarea id="generalSetbacks" name="generalSetbacks" maxLength={2000} defaultValue={todays?.generalSetbacks ?? ""} style={{ minHeight: 70 }} />
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <SubmitButton>{todays ? "Update log" : "Submit log"}</SubmitButton>
            {todays && <span className="hint">You can edit this until {formatDateTime(todays.editableUntil)}.</span>}
          </div>
        </form>
      ) : (
        <div className="card">
          <div className="stat-label">Today · submitted {formatDateTime(todays!.submittedAt)}</div>
          <p className="pre" style={{ marginTop: 6 }}>{todays!.activityText}</p>
          {todays!.generalSetbacks && <p className="pre small muted">Setbacks: {todays!.generalSetbacks}</p>}
        </div>
      )}

      <div>
        <h2 className="h2">Past logs</h2>
        {past.length === 0 && <p className="muted">No earlier logs yet.</p>}
        {past.map((l) => (
          <div key={l.id} className="card" style={{ marginBottom: 10 }}>
            <div className="stat-label">{formatDay(l.logDate)}</div>
            <p className="pre">{l.activityText}</p>
            {l.generalSetbacks && <p className="pre small muted">Setbacks: {l.generalSetbacks}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
