// Single-series charts in one ink. Every bar has a hover/focus tooltip and each
// chart offers its numbers as a table, so nothing depends on seeing the bars.

export function DailyBars({ label, points, format }: { label: string; points: { day: string; value: number; tip: string }[]; format: (v: number) => string }) {
  const max = Math.max(0, ...points.map((p) => p.value));
  const first = points[0]?.day;
  const last = points[points.length - 1]?.day;
  return (
    <figure className="chart" aria-label={label}>
      <div className="chart-max">{max > 0 ? format(max) : ""}</div>
      <div className="bars">
        {points.map((p) => (
          <div key={p.day} className="bar" tabIndex={0} data-tip={p.tip} aria-label={p.tip}>
            <span style={{ height: max ? `${(p.value / max) * 100}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="bar-axis">
        <span>{first}</span>
        <span>{last}</span>
      </div>
      <details style={{ marginTop: 8 }}>
        <summary className="small">Show as table</summary>
        <div className="table-wrap" style={{ marginTop: 8, maxHeight: 260, overflowY: "auto" }}>
          <table>
            <tbody>
              {points.map((p) => (
                <tr key={p.day}>
                  <td>{p.day}</td>
                  <td className="num">{format(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export function RankBars({ rows, empty = "No data in this period." }: { rows: { label: string; value: number; display: string }[]; empty?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div role="table">
      {rows.map((r) => (
        <div className="hbar" role="row" key={r.label}>
          <span role="cell">{r.label}</span>
          <span className="hbar-track" aria-hidden>
            <span className="hbar-fill" style={{ display: "block", width: max ? `${(r.value / max) * 100}%` : 0 }} />
          </span>
          <span role="cell" className="num">
            {r.display}
          </span>
        </div>
      ))}
    </div>
  );
}
