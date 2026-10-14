import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-h1">Your cart</h1>
      </div>
      <CartView />
    </>
  );
}
