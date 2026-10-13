import Link from "next/link";
import { ImpactStats } from "@/components/ImpactStats";
import { LiveCounter } from "@/components/LiveCounter";
import { Naira } from "@/components/Naira";
import { HeroCarousel, type HeroSlide } from "@/components/HeroCarousel";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { gridClass, listProducts } from "@/lib/catalog";
import { getGivingTotals } from "@/lib/giving";

// Products and prices refresh every 60s; admin edits also trigger an immediate refresh.
export const revalidate = 60;

// Homepage photos (public/images). The editorial Ythirst slot shows its caption
// only, with no empty image area.
const HERO_SLIDES: HeroSlide[] = [
  { src: "/images/products/parfait-classic.jpg", alt: "Yogurmac Greek yogurt parfait with apple, coconut and granola", href: "/products", position: "center 8%" },
  { src: "/images/hero/ythirst-outreach.jpg", alt: "Children at a Ythirst outreach making heart shapes with their hands", href: "/ythirst", position: "center 45%" },
  { src: "/images/hero/ythirst-900-children.jpg", alt: "900 children and counting, supported through the Ythirst Project", href: "/ythirst" },
];

const IMAGES = {
  editorialProduct: "/images/products/greek-yogurt-unsweetened.jpg",
  editorialLifestyle: "/images/products/parfait-chocolate.jpg",
  editorialKitchen: "/images/products/ridi-chocolate.jpg",
};

const VALUES = [
  { name: "Faith-driven", desc: "A business built on faith, run with integrity and care." },
  { name: "Indigenous quality", desc: "Premium products made right here in Lagos, Nigeria." },
  { name: "Community impact", desc: "Donations fund the Ythirst Community Project." },
  { name: "Wholesome nutrition", desc: "Real ingredients, made fresh for every single order." },
];

export default async function Home() {
  const [products, giving] = await Promise.all([listProducts({ featuredOnly: true }), getGivingTotals()]);

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
              Give to a child
            </Link>
          </div>
        </div>
        <div className="hero-cards">
          <div className="hcard-img">
            <HeroCarousel slides={HERO_SLIDES} sizes="(max-width: 860px) 100vw, 47vw" />
          </div>
        </div>
      </div>

      <div className={gridClass(products.length)}>
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} eager={i < 4} />
        ))}
      </div>

      <div className="edit-strip">
        <div className="edit-col">
          <div className="edit-card-tall">
            <ProductImage src={IMAGES.editorialProduct} alt="Yogurmac unsweetened natural Greek yogurt" sizes="(max-width: 860px) 50vw, 33vw" />
          </div>
        </div>
        <div className="edit-col">
          <div className="edit-card-tall">
            <ProductImage src={IMAGES.editorialLifestyle} alt="Chocolate and peanut Greek yogurt parfait" sizes="(max-width: 860px) 50vw, 33vw" />
            <Link href="/our-story" className="edit-cap cap-dark" style={{ textDecoration: "none" }}>
              <span className="cap-text ct-light">Wholesome food. Faith-driven purpose.</span>
              <span className="badge b-cream">Our Story</span>
            </Link>
          </div>
        </div>
        <div className="edit-col">
          <div className="edit-col-stack">
            <div className="edit-card-sm">
              <ProductImage src={IMAGES.editorialKitchen} alt="Ridi chocolate energy bar" sizes="(max-width: 860px) 50vw, 33vw" />
              <div className="edit-cap cap-cream">
                <span className="cap-text ct-dark">Handmade fresh, every single order</span>
                <span className="badge b-gold">Process</span>
              </div>
            </div>
            <Link href="/ythirst" className="edit-cap cap-green static" style={{ textDecoration: "none" }}>
              <span className="cap-text ct-light">Supporting children in need</span>
              <span className="badge b-cream">Ythirst</span>
            </Link>
          </div>
        </div>
      </div>

      <section className="ythirst" aria-labelledby="yt-h">
        <div className="yt-eye">The Ythirst Community Project</div>
        <h2 className="yt-h2" id="yt-h">
          Supporting young children in need across Lagos.
        </h2>
        <div className="yt-funding">Funded entirely by donations — ₦500 supports one child — not product sales</div>
        <p className="yt-note">
          Through Ythirst, Yogurmac visits schools and communities across Lagos to support young children in need. Every
          outreach is paid for by people who give.
        </p>
        <ImpactStats />
        <Link className="yt-lnk" href="/ythirst">
          Read the full story →
        </Link>
      </section>

      <div className="partner">
        <div className="pt-l">
          <h2 className="pt-h2">
            <Naira value={500} /> supports one child.
          </h2>
          <p className="pt-sub">
            Give once, for as many children as you like. Every gift funds Ythirst outreach to children in need across Lagos.
            Product purchases are separate; this is purely mission-driven giving.
          </p>
          <Link className="btn-pt" href="/partner" style={{ alignSelf: "flex-start", marginTop: 18 }}>
            Give now →
          </Link>
        </div>
        <div className="pt-r">
          <LiveCounter initial={giving} />
        </div>
      </div>

      <div className="values" aria-label="Our values">
        {VALUES.map((v, i) => (
          <div className="value" key={v.name}>
            <div className="value-num" aria-hidden>
              {String(i + 1).padStart(2, "0")}
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
