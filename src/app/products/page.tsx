import type { Metadata } from "next";
import { ProductFilter } from "@/components/ProductFilter";
import { listProducts } from "@/lib/catalog";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Products",
  description: "Greek yogurt, granola and energy bars, made fresh to order in Lagos.",
};

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <>
      <div className="page-head dots">
        <div className="eyebrow">Shop</div>
        <h1 className="page-h1">Our products</h1>
        <p className="page-lede">Every order is made fresh for you and ready in 2–3 business days, with delivery across all 20 Lagos LGAs.</p>
      </div>
      <ProductFilter products={products} />
    </>
  );
}
