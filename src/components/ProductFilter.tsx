"use client";

import { useState } from "react";
import { gridClass, type ProductSummary } from "@/lib/categories";
import { ProductCard } from "./ProductCard";

export function ProductFilter({ products }: { products: ProductSummary[] }) {
  const [category, setCategory] = useState<string | null>(null);
  // One chip per category that has products, in the admin's order.
  const filters = [
    { value: null, label: "All" },
    ...[...new Map(products.map((p) => [p.category.slug, p.category])).values()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ value: c.slug, label: c.name })),
  ];
  const shown = category ? products.filter((p) => p.category.slug === category) : products;
  return (
    <>
      <div className="filter-bar" role="group" aria-label="Filter by category">
        {filters.map((f) => (
          <button key={f.label} className="chip" aria-pressed={category === f.value} onClick={() => setCategory(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className={gridClass(shown.length)}>
          {shown.map((p, i) => (
            <ProductCard key={p.id} product={p} eager={i < 4} />
          ))}
        </div>
      ) : (
        <p className="empty">No products in this category right now.</p>
      )}
    </>
  );
}
