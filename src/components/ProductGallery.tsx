"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";

const TONES = { YOGURT: "ph-yogurt", GRANOLA: "ph-granola", ENERGY_BAR: "ph-bar" } as const;

export function ProductGallery({
  name,
  images,
  category,
}: {
  name: string;
  images: string[];
  category: keyof typeof TONES;
}) {
  const [index, setIndex] = useState(0);
  return (
    <div className="pd-gallery">
      <div className="pd-main">
        <ProductImage
          src={images[index]}
          alt={name}
          label={`[ ${name} ]`}
          tone={TONES[category]}
          priority
          sizes="(max-width: 860px) 100vw, 53vw"
        />
      </div>
      {images.length > 1 && (
        <div className="pd-thumbs">
          {images.map((src, i) => (
            <button key={src} className="pd-thumb" aria-label={`Show image ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)}>
              <ProductImage src={src} alt="" sizes="84px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
