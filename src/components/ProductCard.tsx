import Link from "next/link";
import { CATEGORY_LABELS, type ProductSummary } from "@/lib/categories";
import { formatNaira } from "@/lib/money";
import { ProductImage } from "./ProductImage";

const TONES: Record<ProductSummary["category"], string> = {
  YOGURT: "ph-yogurt",
  GRANOLA: "ph-granola",
  ENERGY_BAR: "ph-bar",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ProductCard({ product, eager }: { product: ProductSummary; eager?: boolean }) {
  const href = `/products/${product.slug}`;
  return (
    <div className="pcard">
      <Link href={href}>
        <div className="pcard-img">
          <ProductImage src={product.image} alt={product.name} label={`[ ${product.name} ]`} tone={TONES[product.category]} eager={eager} />
        </div>
        <div className="pcard-body">
          <div className="pcard-nm">{product.name}</div>
          <div className="pcard-pr">
            {product.fromPrice ? `From ${formatNaira(product.fromPrice)}` : "Currently unavailable"} ·{" "}
            {plural(product.sizeCount, "size")} · {plural(product.flavourCount, "flavour")}
          </div>
        </div>
      </Link>
      <div className="card-bar">
        <span className="card-bar-title">{CATEGORY_LABELS[product.category]}</span>
        <Link className="pcard-cta" href={href}>
          Order now
        </Link>
      </div>
    </div>
  );
}
