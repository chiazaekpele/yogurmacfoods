"use client";

import { useEffect, useState } from "react";
import type { GivingTotals } from "@/lib/giving";
import { Naira } from "./Naira";

const POLL_MS = 5000;

// Total given and children supported, refreshed every few seconds while the
// page is visible, so new donations show up almost as they happen.
export function LiveCounter({ initial }: { initial: GivingTotals }) {
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
            const next = (await res.json()) as GivingTotals;
            setTotals((prev) => {
              if (next.children !== prev.children) {
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
    <div className={`counter ${bump ? "counter-bump" : ""}`} aria-live="polite">
      <div className="counter-cell">
        <div className="counter-num">{totals.children.toLocaleString("en-NG")}</div>
        <div className="counter-lbl">{totals.children === 1 ? "child supported" : "children supported"}</div>
      </div>
      <div className="counter-cell">
        <div className="counter-num">
          <Naira value={totals.raised} />
        </div>
        <div className="counter-lbl">given so far</div>
      </div>
      <div className="counter-live">
        <span className="counter-dot" aria-hidden /> Live · updates as gifts come in
      </div>
    </div>
  );
}
