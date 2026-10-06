"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/categories";
import { ProductCard } from "./ProductCard";

const FILTERS = [
  { value: null, label: "All" },
  { value: "YOGURT", label: "Greek Yogurt" },
  { value: "GRANOLA", label: "Granola" },
  { value: "ENERGY_BAR", label: "Energy Bars" },
] as const;

export function ProductFilter({ products }: { products: ProductSummary[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const shown = category ? products.filter((p) => p.category === category) : products;
  return (
    <>
      <div className="filter-bar" role="group" aria-label="Filter by category">
        {FILTERS.map((f) => (
          <button key={f.label} className="chip" aria-pressed={category === f.value} onClick={() => setCategory(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="prod-grid dots" style={{ borderTop: "none" }}>
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="empty">No products in this category right now.</p>
      )}
    </>
  );
}
