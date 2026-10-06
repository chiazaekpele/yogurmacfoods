"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { formatNaira, fromKobo, toKobo } from "@/lib/money";
import { ProductImage } from "./ProductImage";

export function CartView() {
  const { items, subtotalKobo, setQuantity, remove } = useCart();

  if (!items.length) {
    return (
      <div className="empty">
        <p style={{ marginBottom: 16 }}>Your cart is empty.</p>
        <Link className="btn" href="/products">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="two-col">
      <div className="main">
        {items.map((i) => (
          <div className="line" key={i.variantId}>
            <Link className="line-img" href={`/products/${i.slug}`} aria-label={i.productName}>
              <ProductImage src={i.image} alt="" label=" " sizes="72px" />
            </Link>
            <div>
              <div className="line-nm">{i.productName}</div>
              <div className="line-meta">
                {i.flavour} · {i.size} · {formatNaira(i.unitPrice)} each
              </div>
              <div className="line-actions">
                <div className="qty">
                  <button aria-label={`Decrease ${i.productName}`} onClick={() => setQuantity(i.variantId, i.quantity - 1)}>
                    −
                  </button>
                  <input
                    inputMode="numeric"
                    aria-label={`Quantity of ${i.productName}`}
                    value={i.quantity}
                    onChange={(e) => setQuantity(i.variantId, Number(e.target.value.replace(/\D/g, "")))}
                  />
                  <button aria-label={`Increase ${i.productName}`} onClick={() => setQuantity(i.variantId, i.quantity + 1)}>
                    +
                  </button>
                </div>
                <button className="remove" onClick={() => remove(i.variantId)}>
                  Remove
                </button>
              </div>
            </div>
            <div className="line-total">{formatNaira(fromKobo(toKobo(i.unitPrice) * i.quantity))}</div>
          </div>
        ))}
        <p style={{ marginTop: 16 }}>
          <Link className="link" href="/products">
            ← Continue shopping
          </Link>
        </p>
      </div>
      <div className="aside summary">
        <h2>Summary</h2>
        <div className="sum-row">
          <span>Subtotal</span>
          <span>{formatNaira(fromKobo(subtotalKobo))}</span>
        </div>
        <div className="sum-row" style={{ color: "var(--muted)" }}>
          <span>Delivery</span>
          <span>Calculated at checkout</span>
        </div>
        <Link className="btn btn-block" href="/checkout" style={{ marginTop: 16 }}>
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
