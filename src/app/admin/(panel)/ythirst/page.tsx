import type { Metadata } from "next";
import { Flash } from "@/components/admin/Flash";
import { PageHead } from "@/components/admin/PageHead";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/lagos-time";
import { requireAdmin } from "@/lib/admin/session";
import { saveImpact } from "./actions";

export const metadata: Metadata = { title: "Ythirst impact" };

export default async function YthirstPage({ searchParams }: PageProps<"/admin/ythirst">) {
  await requireAdmin();
  const [stats, history] = await Promise.all([
    db.impactStat.findMany({ orderBy: { sortOrder: "asc" } }),
    db.auditLog.findMany({ where: { action: "IMPACT_STAT_UPDATED" }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const labels = new Map(stats.map((s) => [s.key, s.label]));
  return (
    <div className="stack">
      <PageHead title="Ythirst impact" lede="The three numbers shown on the shop’s homepage and Ythirst page." />
      <Flash searchParams={searchParams} />
      <form action={saveImpact} className="card" style={{ maxWidth: 520 }}>
        {stats.map((s) => (
          <div className="field" key={s.id}>
            <label htmlFor={s.key}>{s.label}</label>
            <input id={s.key} name={s.key} type="number" min="0" step="1" required defaultValue={s.value} />
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <SubmitButton>Save changes</SubmitButton>
        </div>
      </form>
      <div>
        <h2 className="h2">Change history</h2>
        {history.length === 0 && <p className="muted">No changes yet.</p>}
        <ul className="timeline">
          {history.map((h) => {
            const [key, from] = Object.entries((h.previousValue ?? {}) as Record<string, number>)[0] ?? [];
            const to = key ? (h.newValue as Record<string, number>)[key] : undefined;
            return (
              <li key={h.id}>
                {labels.get(key ?? "") ?? key}: {from} → {to}
                <div className="small muted">{formatDateTime(h.createdAt)}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
