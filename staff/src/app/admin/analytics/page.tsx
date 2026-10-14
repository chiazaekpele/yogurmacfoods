import type { Metadata } from "next";
import Link from "next/link";
import { DailyBars, RankBars } from "@/components/Charts";
import { PageHead } from "@/components/PageHead";
import { dailySeries, periodBreakdowns, resolveRange, revenueSummary } from "@/lib/analytics";
import { boxSummary } from "@/lib/donations";
import { formatNaira, fromKobo, toKobo } from "@/lib/money";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/order-status";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Analytics" };

const naira = (kobo: number) => formatNaira(fromKobo(kobo));
const RANGES = [
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["90d", "Last 3 months"],
  ["year", "This year"],
] as const;

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const range = resolveRange(s("range"), s("from"), s("to"));

  const [summary, daily, breakdown, donations] = await Promise.all([revenueSummary(), dailySeries(range), periodBreakdowns(range), boxSummary()]);
  const periodOrders = daily.reduce((n, d) => n + d.orders, 0);
  const periodProduct = daily.reduce((n, d) => n + d.productKobo, 0);
  const periodTotal = daily.reduce((n, d) => n + d.totalKobo, 0);
  const statusCount = Object.fromEntries(breakdown.byStatus.map((b) => [b.status, b._count]));

  return (
    <div className="stack">
      <PageHead title="Analytics" lede="Product revenue excludes delivery fees; total collected includes them." />

      <div className="grid grid-4">
        {(
          [
            ["Today", summary.today],
            ["This week", summary.week],
            ["This month", summary.month],
            ["This year", summary.year],
          ] as const
        ).map(([label, v]) => (
          <div className="card" key={label}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{naira(v.productKobo)}</div>
            <div className="stat-sub">
              {naira(v.totalKobo)} collected · {v.orders} order{v.orders === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      {/* Filters sit in one row above the charts they control. */}
      <form className="filters" aria-label="Time range">
        <div className="pill-list" style={{ alignSelf: "center" }}>
          {RANGES.map(([k, l]) => (
            <Link key={k} href={`/admin/analytics?range=${k}`} className={`btn btn-sm ${range.key === k ? "" : "btn-ghost"}`}>
              {l}
            </Link>
          ))}
        </div>
        <input type="hidden" name="range" value="custom" />
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={range.key === "custom" ? s("from") : ""} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={range.key === "custom" ? s("to") : ""} />
        </div>
        <button className="btn btn-sm">Custom range</button>
      </form>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h2">Product revenue per day</h2>
          <p className="small muted" style={{ marginBottom: 8 }}>
            {range.label}: {naira(periodProduct)} ({naira(periodTotal)} collected)
          </p>
          <DailyBars
            label="Product revenue per day"
            format={naira}
            points={daily.map((d) => ({ day: d.day, value: d.productKobo, tip: `${d.day}\n${naira(d.productKobo)} product revenue\n${naira(d.totalKobo)} collected` }))}
          />
        </div>
        <div className="card">
          <h2 className="h2">Orders per day</h2>
          <p className="small muted" style={{ marginBottom: 8 }}>
            {range.label}: {periodOrders} order{periodOrders === 1 ? "" : "s"}
          </p>
          <DailyBars
            label="Orders per day"
            format={(v) => String(v)}
            points={daily.map((d) => ({ day: d.day, value: d.orders, tip: `${d.day}\n${d.orders} order${d.orders === 1 ? "" : "s"}` }))}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h2">Orders by status</h2>
          <RankBars
            rows={STATUS_ORDER.map((st) => {
              const c = statusCount[st] ?? 0;
              return { label: STATUS_LABELS[st], value: c, display: `${c} (${periodOrders ? Math.round((c / periodOrders) * 100) : 0}%)` };
            })}
          />
        </div>
        <div className="card">
          <h2 className="h2">Orders by LGA</h2>
          <RankBars rows={breakdown.byLga.map((l) => ({ label: l.lga, value: l._count, display: `${l._count} · ${formatNaira(l._sum.total?.toString() ?? "0")}` }))} />
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h2 className="h2">Top products by units</h2>
          <RankBars rows={breakdown.productsByUnits.map((p) => ({ label: p.name, value: Number(p.units), display: String(p.units) }))} />
        </div>
        <div className="card">
          <h2 className="h2">Top products by revenue</h2>
          <RankBars rows={breakdown.productsByRevenue.map((p) => ({ label: p.name, value: toKobo(p.revenue), display: formatNaira(p.revenue) }))} />
        </div>
        <div className="card">
          <h2 className="h2">Top flavours and sizes</h2>
          <RankBars rows={breakdown.variants.map((v) => ({ label: `${v.name} (${v.flavour}, ${v.size})`, value: Number(v.units), display: String(v.units) }))} />
        </div>
      </div>

      <div>
        <h2 className="h2">Wellness boxes sold</h2>
        <p className="lede" style={{ marginTop: 0 }}>Each day of a daily box counts as one box. This is the number on the shop’s Business Impact page.</p>
        <div className="grid grid-3">
          {(
            [
              ["This month", donations.month],
              ["This year", donations.year],
              ["All time", donations.all],
            ] as const
          ).map(([label, n]) => (
            <div className="card" key={label}>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{n.toLocaleString("en-NG")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
