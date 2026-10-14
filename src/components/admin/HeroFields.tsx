"use client";

import { useState } from "react";

export const POSITIONS = [
  { value: "", label: "Middle" },
  { value: "center top", label: "Top" },
  { value: "center 25%", label: "Upper middle" },
  { value: "center 75%", label: "Lower middle" },
  { value: "center bottom", label: "Bottom" },
];

export type SlideFields = { alt: string; href: string; position: string; fit: string; background: string };

// The editable settings of one homepage image, with a live preview of the crop.
export function HeroFields({ idPrefix, imageUrl, initial }: { idPrefix: string; imageUrl: string | null; initial: SlideFields }) {
  const [v, setV] = useState(initial);
  const set = (k: keyof SlideFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const positions = POSITIONS.some((p) => p.value === v.position) ? POSITIONS : [...POSITIONS, { value: v.position, label: "As set now" }];
  const id = (n: string) => `${idPrefix}-${n}`;

  return (
    <div className="hero-edit">
      <div className="hero-preview" style={{ background: v.fit === "contain" ? v.background || "#FFFFFF" : "var(--soft)" }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ objectFit: v.fit === "contain" ? "contain" : "cover", objectPosition: v.position || "center" }} />
        ) : (
          <span className="muted small">Preview appears after upload</span>
        )}
      </div>
      <div>
        <div className="field">
          <label htmlFor={id("alt")}>Describe the image (for screen readers and search)</label>
          <input id={id("alt")} name="alt" type="text" value={v.alt} onChange={set("alt")} maxLength={200} required />
        </div>
        <div className="field">
          <label htmlFor={id("href")}>Where it links to</label>
          <input id={id("href")} name="href" type="text" value={v.href} onChange={set("href")} maxLength={200} placeholder="/products" />
          <span className="hint">A page on this site, e.g. /products, /impact or /products/greek-yogurt</span>
        </div>
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor={id("fit")}>How it fills the banner</label>
            <select id={id("fit")} name="fit" value={v.fit} onChange={set("fit")}>
              <option value="cover">Fill the banner (photos)</option>
              <option value="contain">Show the whole image (graphics with text)</option>
            </select>
          </div>
          {v.fit === "contain" ? (
            <div className="field">
              <label htmlFor={id("background")}>Colour around it</label>
              <input id={id("background")} name="background" type="color" value={v.background || "#FFFFFF"} onChange={set("background")} style={{ height: 42, padding: 4 }} />
            </div>
          ) : (
            <div className="field">
              <label htmlFor={id("position")}>Keep in view when cropped</label>
              <select id={id("position")} name="position" value={v.position} onChange={set("position")}>
                {positions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {v.fit === "contain" && <input type="hidden" name="position" value={v.position} />}
      </div>
    </div>
  );
}
