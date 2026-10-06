import Link from "next/link";
import { ImpactStats } from "@/components/ImpactStats";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getImpactStats, listActiveTiers, listProducts } from "@/lib/catalog";
import { formatNaira } from "@/lib/money";

// Products and prices refresh every 60s; admin edits also trigger an immediate refresh.
export const revalidate = 60;

// Homepage image slots (docs/homepage-image-mapping-prompt.md). Fill these with
// files in public/product-images once the photos are recovered.
const IMAGES = {
  heroProduct: null as string | null,
  heroYthirst: null as string | null,
  editorialLifestyle: null as string | null,
  editorialYthirst: null as string | null,
  editorialKitchen: null as string | null,
};

const VALUES = [
  { icon: "✝", name: "Faith-driven", desc: "A business built on faith, run with integrity and care." },
  { icon: "🇳🇬", name: "Indigenous quality", desc: "Premium products made right here in Lagos, Nigeria." },
  { icon: "🤝", name: "Community impact", desc: "Partner giving funds the Ythirst Community Project." },
  { icon: "🌾", name: "Wholesome nutrition", desc: "Real ingredients, made fresh for every single order." },
];

export default async function Home() {
  const [products, stats, tiers] = await Promise.all([
    listProducts({ featuredOnly: true }),
    getImpactStats(),
    listActiveTiers(),
  ]);
  const children = stats.find((s) => s.key === "children_reached");

  return (
    <>
      <div className="hero dots">
        <div className="hero-text">
          <div>
            <h1 className="hero-h1">We make premium Greek yogurt, granola &amp; energy bars right here in Nigeria.</h1>
            <p className="hero-sub">
              Yogurmac Foods Limited is a faith-driven indigenous food brand crafting wholesome products made to order and
              delivered across all 20 Lagos local government areas.
            </p>
          </div>
          <div className="hero-ctas">
            <Link className="hero-cta alt" href="/products">
              Shop now →
            </Link>
            <Link className="hero-cta" href="/partner">
              Partner with us
            </Link>
          </div>
        </div>
        <div className="hero-cards">
          <div className="hcard-img">
            <ProductImage
              src={IMAGES.heroProduct}
              alt="Yogurmac Greek yogurt, granola and energy bars"
              label="[ Product hero photography ]"
              tone="ph-product"
              priority
              sizes="(max-width: 860px) 100vw, 47vw"
            />
            <div className="hcard-strip-dark">
              <span className="strip-label">Made fresh. To your order. Every time.</span>
              <span className="badge b-gray">Products</span>
            </div>
          </div>
          <div className="hcard-img">
            <ProductImage
              src={IMAGES.heroYthirst}
              alt="Children at a Ythirst outreach in Lagos"
              label="[ Ythirst outreach photography ]"
              tone="ph-outreach"
              priority
              sizes="(max-width: 860px) 100vw, 47vw"
            />
            {children && (
              <Link href="/ythirst" className="hcard-strip-gold" style={{ textDecoration: "none" }}>
                <div>
                  <div className="strip-stat-num">{children.value.toLocaleString("en-NG")}</div>
                  <div className="strip-stat-lbl">
                    Children supported
                    <br />
                    through the Ythirst Project
                  </div>
                </div>
                <span className="badge b-dark">Ythirst</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="prod-grid dots">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <div className="edit-strip">
        <div className="edit-col">
          <div className="edit-dot-tile dots" />
        </div>
        <div className="edit-col">
          <div className="edit-card-tall">
            <ProductImage src={IMAGES.editorialLifestyle} alt="Yogurmac products at a Lagos breakfast table" label="[ Brand lifestyle photography ]" tone="ph-lifestyle" />
            <Link href="/our-story" className="edit-cap cap-dark" style={{ textDecoration: "none" }}>
              <span className="cap-text ct-light">Wholesome food. Faith-driven purpose.</span>
              <span className="badge b-cream">Our Story</span>
            </Link>
          </div>
        </div>
        <div className="edit-col">
          <div className="edit-col-stack">
            <div className="edit-card-sm">
              <ProductImage src={IMAGES.editorialYthirst} alt="Children at a Ythirst community outreach" label="[ Ythirst outreach photography ]" tone="ph-outreach2" />
              <Link href="/ythirst" className="edit-cap cap-green" style={{ textDecoration: "none" }}>
                <span className="cap-text ct-light">Supporting children in need</span>
                <span className="badge b-cream">Ythirst</span>
              </Link>
            </div>
            <div className="edit-card-sm">
              <ProductImage src={IMAGES.editorialKitchen} alt="Yogurmac products being made by hand" label="[ Production photography ]" tone="ph-kitchen" />
              <div className="edit-cap cap-cream">
                <span className="cap-text ct-dark">Handmade fresh, every single order</span>
                <span className="badge b-gold">Process</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="ythirst" aria-labelledby="yt-h">
        <div className="yt-eye">The Ythirst Community Project</div>
        <h2 className="yt-h2" id="yt-h">
          Supporting young children in need across Lagos.
        </h2>
        <div className="yt-funding">Funded entirely by our partner subscriptions &amp; donations — not product sales</div>
        <p className="yt-note">
          Through Ythirst, Yogurmac visits schools and communities across Lagos to support young children in need. Every
          outreach is paid for by our partners.
        </p>
        <ImpactStats />
        <Link className="yt-lnk" href="/ythirst">
          Read the full story →
        </Link>
      </section>

      <div className="partner">
        <div className="pt-l">
          <h2 className="pt-h2">Subscribe monthly. Support a child in need.</h2>
          <p className="pt-sub">
            Our Ythirst outreaches are funded entirely by people and organisations who choose to give monthly. Product
            purchases are separate — this is purely a mission-driven giving programme.
          </p>
        </div>
        <div className="pt-r">
          {tiers.slice(0, 3).map((t) => (
            <div className="pt-tier" key={t.id}>
              <div>
                <div className="pt-nm">{t.name}</div>
                <div className="pt-ds">{t.description}</div>
              </div>
              <div className="pt-amt">{formatNaira(t.monthlyAmount)}/mo</div>
            </div>
          ))}
          <Link className="btn-pt" href="/partner">
            Become a partner →
          </Link>
        </div>
      </div>

      <div className="values" aria-label="Our values">
        {VALUES.map((v) => (
          <div className="value" key={v.name}>
            <div className="value-ic" aria-hidden>
              {v.icon}
            </div>
            <div className="value-nm">{v.name}</div>
            <div className="value-ds">{v.desc}</div>
          </div>
        ))}
      </div>

      <div className="more-row dots">
        <Link className="btn-more" href="/products">
          Show all products +
        </Link>
      </div>
    </>
  );
}
