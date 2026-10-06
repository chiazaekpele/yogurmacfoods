import { getImpactStats } from "@/lib/catalog";

export async function ImpactStats() {
  const stats = await getImpactStats();
  return (
    <div className="yt-stats">
      {stats.map((s) => (
        <div className="yt-stat" key={s.key}>
          <div className="yt-num">{s.value.toLocaleString("en-NG")}</div>
          <div className="yt-lbl">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
