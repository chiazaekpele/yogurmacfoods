import { getImpactStats } from "@/lib/catalog";

export async function ImpactStats() {
  const stats = await getImpactStats();
  return (
    <div className="yt-stats">
      {stats.map((s) => (
        <div className="yt-stat" key={s.key}>
          <div className="yt-num">
            {s.value.toLocaleString("en-NG")}
            {/* Yogurmac: "900+ children reached" (still counting). */}
            {s.key === "children_reached" ? "+" : ""}
          </div>
          <div className="yt-lbl">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
