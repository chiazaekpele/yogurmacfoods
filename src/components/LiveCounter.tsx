"use client";

import { useEffect, useState } from "react";
import type { BoxTotals } from "@/lib/giving";

const POLL_MS = 15_000; // matches the server-side cache in lib/giving.ts

// Wellness boxes sold, refreshed every few seconds while the page is visible.
export function LiveCounter({ initial }: { initial: BoxTotals }) {
  const [totals, setTotals] = useState(initial);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch("/api/giving", { cache: "no-store" });
          if (res.ok) {
            const next = (await res.json()) as BoxTotals;
            setTotals((prev) => {
              if (next.boxes !== prev.boxes) {
                setBump(true);
                setTimeout(() => setBump(false), 900);
              }
              return next;
            });
          }
        } catch {
          // network blip: try again next time
        }
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    const onVisible = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div className={`counter counter-single ${bump ? "counter-bump" : ""}`} aria-live="polite">
      <div className="counter-cell">
        <div className="counter-num">{totals.boxes.toLocaleString("en-NG")}</div>
        <div className="counter-lbl">{totals.boxes === 1 ? "wellness box sold" : "wellness boxes sold"}</div>
      </div>
      <div className="counter-live">
        <span className="counter-dot" aria-hidden /> Live · 25% of our profits support the Ythirst Project
      </div>
    </div>
  );
}
