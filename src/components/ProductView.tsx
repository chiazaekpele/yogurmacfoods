"use client";

import { useCallback, useState } from "react";
import { ProductGallery } from "./ProductGallery";
import { VariantPicker } from "./VariantPicker";

type Variant = { id: string; flavour: string; size: string; price: string; isAvailable: boolean; imageUrl: string | null };

// Product photo and option picker, so choosing a flavour shows its photo.
export function ProductView({
  product,
  variants,
  header,
  footer,
}: {
  product: { name: string; slug: string; images: string[]; category: "YOGURT" | "GRANOLA" | "ENERGY_BAR" | "WELLNESS_BOX" };
  variants: Variant[];
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const showImage = useCallback(
    (url: string) => {
      const i = product.images.indexOf(url);
      if (i >= 0) setIndex(i);
    },
    [product.images],
  );
  return (
    <div className="pd">
      <ProductGallery name={product.name} images={product.images} index={index} onIndex={setIndex} />
      <div className="pd-info">
        {header}
        <VariantPicker product={{ name: product.name, slug: product.slug, image: product.images[0] ?? null }} variants={variants} onImage={showImage} isBox={product.category === "WELLNESS_BOX"} />
        {footer}
      </div>
    </div>
  );
}
