import Link from "next/link";
import { CATEGORY_LABELS, type ProductSummary } from "@/lib/categories";
import { formatNaira } from "@/lib/money";
import { ProductImage } from "./ProductImage";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ProductCard({ product, eager }: { product: ProductSummary; eager?: boolean }) {
  return (
    <Link className="pcard" href={`/products/${product.slug}`}>
      <div className="pcard-img">
        <ProductImage src={product.image} alt={product.name} eager={eager} sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 300px" />
      </div>
      <div className="pcard-body">
        <span className="pcard-cat">{CATEGORY_LABELS[product.category]}</span>
        <h3 className="pcard-nm">{product.name}</h3>
        <p className="pcard-pr">{product.fromPrice ? `From ${formatNaira(product.fromPrice)}` : "Currently unavailable"}</p>
        <p className="pcard-meta">
          {product.category === "WELLNESS_BOX"
            ? plural(product.flavourCount, "tier")
            : `${plural(product.sizeCount, "size")} · ${plural(product.flavourCount, "flavour")}`}
        </p>
        <span className="text-link pcard-cta">
          Order now
        </span>
      </div>
    </Link>
  );
}
