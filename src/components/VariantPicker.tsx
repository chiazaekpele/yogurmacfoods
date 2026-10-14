"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MAX_DAYS, useCart } from "@/hooks/useCart";
import { formatNaira, fromKobo, toKobo } from "@/lib/money";
import { Naira } from "./Naira";

type Variant = { id: string; flavour: string; size: string; price: string; isAvailable: boolean; imageUrl: string | null; contents?: string | null };

export function VariantPicker({
  product,
  variants,
  onImage,
  isBox = false,
}: {
  product: { name: string; slug: string; image: string | null };
  variants: Variant[];
  // Called with the chosen option's photo so the gallery can show it.
  onImage?: (url: string) => void;
  // Wellness boxes: tiers instead of flavours, and a number of days.
  isBox?: boolean;
}) {
  const flavours = useMemo(() => [...new Set(variants.map((v) => v.flavour))], [variants]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size))], [variants]);
  const first = variants.find((v) => v.isAvailable);

  const [flavour, setFlavour] = useState(first?.flavour ?? flavours[0]);
  const [size, setSize] = useState(first?.size ?? sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  const find = (f: string, s: string) => variants.find((v) => v.flavour === f && v.size === s);
  const selected = find(flavour, size);
  const canBuy = !!selected?.isAvailable;
  const selectedImage = selected?.imageUrl ?? null;
  const contents = isBox ? (selected?.contents ?? "").split("\n").map((l) => l.trim()).filter(Boolean) : [];

  useEffect(() => {
    if (selectedImage) onImage?.(selectedImage);
  }, [selectedImage, onImage]);

  // Choosing a flavour with no stock in the current size jumps to an available size.
  const chooseFlavour = (f: string) => {
    setFlavour(f);
    if (!find(f, size)?.isAvailable) {
      const alt = variants.find((v) => v.flavour === f && v.isAvailable);
      if (alt) setSize(alt.size);
    }
    setAdded(false);
  };

  if (!first) return <p className="form-err">This product is currently unavailable.</p>;

  return (
    <>
      <div className="pd-price" aria-live="polite">
        {selected && canBuy ? <Naira value={selected.price} /> : "Unavailable"}
        {isBox && selected && canBuy && <span className="pd-price-unit"> per box</span>}
      </div>

      {flavours.length > 1 || flavours[0] ? (
        <div>
          <div className="opt-label" id="flavour-label">
            {isBox ? "Tier" : "Flavour"}
          </div>
          <div className="opt-row" role="group" aria-labelledby="flavour-label">
            {flavours.map((f) => (
              <button
                key={f}
                className="opt"
                aria-pressed={f === flavour}
                disabled={!variants.some((v) => v.flavour === f && v.isAvailable)}
                onClick={() => chooseFlavour(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {contents.length > 0 && (
        <div className="box-contents">
          <div className="opt-label">In the {flavour} box</div>
          <ul>
            {contents.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {isBox && sizes.length < 2 ? null : (
      <div>
        <div className="opt-label" id="size-label">
          Size
        </div>
        <div className="opt-row" role="group" aria-labelledby="size-label">
          {sizes.map((s) => (
            <button
              key={s}
              className="opt"
              aria-pressed={s === size}
              disabled={!find(flavour, s)?.isAvailable}
              onClick={() => {
                setSize(s);
                setAdded(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      )}

      <div>
        <div className="opt-label" id="qty-label">
          Quantity
        </div>
        <div className="qty" style={{ marginTop: 6 }} role="group" aria-labelledby="qty-label">
          <button aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            −
          </button>
          <input
            inputMode="numeric"
            aria-label="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value.replace(/\D/g, "")) || 1)))}
          />
          <button aria-label="Increase quantity" onClick={() => setQuantity((q) => Math.min(99, q + 1))}>
            +
          </button>
        </div>
      </div>

      {isBox && (
        <div>
          <div className="opt-label" id="days-label">
            How many days?
          </div>
          <div className="qty" style={{ marginTop: 6 }} role="group" aria-labelledby="days-label">
            <button aria-label="One day fewer" onClick={() => setDays((d) => Math.max(1, d - 1))} disabled={days <= 1}>
              −
            </button>
            <input
              inputMode="numeric"
              aria-label="Number of days"
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(MAX_DAYS, Number(e.target.value.replace(/\D/g, "")) || 1)))}
            />
            <button aria-label="One day more" onClick={() => setDays((d) => Math.min(MAX_DAYS, d + 1))}>
              +
            </button>
          </div>
          <p className="field-hint" style={{ marginTop: 6 }}>
            {days === 1 ? "One box, delivered once." : `One box delivered each day for ${days} days.`}
            {selected && canBuy && ` Total ${formatNaira(fromKobo(toKobo(selected.price) * quantity * days))}, plus delivery.`}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="btn"
          disabled={!canBuy}
          onClick={() => {
            if (!selected) return;
            add({
              variantId: selected.id,
              slug: product.slug,
              productName: product.name,
              flavour: selected.flavour,
              size: selected.size,
              unitPrice: selected.price,
              image: selected.imageUrl ?? product.image,
              quantity,
              ...(isBox && days > 1 ? { days } : {}),
            });
            setAdded(true);
          }}
        >
          Add to cart
        </button>
        {added && (
          <span role="status" style={{ fontSize: 14 }}>
            Added. <Link className="link" href="/cart">View cart</Link>
          </span>
        )}
      </div>
    </>
  );
}
