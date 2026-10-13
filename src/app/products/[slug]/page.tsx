import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/ProductView";
import { CATEGORY_LABELS, getProductBySlug } from "@/lib/catalog";

export const revalidate = 60;

// Pages are generated on first visit, then cached and refreshed like the listing.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const available = product.variants.filter((v) => v.isAvailable);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    brand: { "@type": "Brand", name: "Yogurmac Foods" },
    offers: available.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "NGN",
          lowPrice: available[0].price,
          highPrice: available[available.length - 1].price,
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductView
        product={{ name: product.name, slug: product.slug, images: product.images, category: product.category }}
        variants={product.variants}
        header={
          <>
            <div>
              <div className="eyebrow">
                <Link href="/products">Products</Link> / {CATEGORY_LABELS[product.category]}
              </div>
              <h1 className="pd-name">{product.name}</h1>
            </div>
            <p className="pd-desc">{product.description}</p>
          </>
        }
        footer={<div className="fresh-note">Made fresh to order — ready in 2–3 business days</div>}
      />

      <div className="pd-story">
        <div>
          <div className="eyebrow">Our story</div>
          <p className="prose">
            Yogurmac Foods is a faith-driven indigenous food brand. We make premium Greek yogurt, granola and energy bars
            in Lagos, fresh for every order, and donations fund the Ythirst Community Project.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link className="link" href="/our-story">
              Read our story →
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
