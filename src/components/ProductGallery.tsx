"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";

export function ProductGallery({
  name,
  images,
  index: controlled,
  onIndex,
}: {
  name: string;
  images: string[];
  // Optional: let a parent drive the shown photo (e.g. from the chosen flavour).
  index?: number;
  onIndex?: (i: number) => void;
}) {
  const [own, setOwn] = useState(0);
  const index = controlled ?? own;
  const setIndex = onIndex ?? setOwn;
  return (
    <div className="pd-gallery">
      <div className="pd-main">
        <ProductImage
          src={images[index]}
          alt={name}
          label={name}
          eager
          sizes="(max-width: 860px) 100vw, 53vw"
        />
      </div>
      {images.length > 1 && (
        <div className="pd-thumbs">
          {images.map((src, i) => (
            <button key={src} className="pd-thumb" aria-label={`Show image ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)}>
              <ProductImage src={src} alt="" sizes="84px" eager />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
