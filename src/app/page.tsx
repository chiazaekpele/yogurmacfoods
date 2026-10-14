import Image from "next/image";
import Link from "next/link";
import { HeroCarousel, type HeroSlide } from "@/components/HeroCarousel";
import { ImpactStats } from "@/components/ImpactStats";
import { LiveCounter } from "@/components/LiveCounter";
import { ProductCard } from "@/components/ProductCard";
import { gridClass, listProducts } from "@/lib/catalog";
import { getBoxTotals } from "@/lib/giving";

// Products and prices refresh every 60s; admin edits also trigger an immediate refresh.
export const revalidate = 60;

const HERO_SLIDES: HeroSlide[] = [
  { src: "/images/products/parfait-classic.jpg", alt: "Yogurmac Greek yogurt parfait with apple, coconut and granola", href: "/products", position: "center 12%" },
  { src: "/images/hero/ythirst-outreach.jpg", alt: "Children at a Ythirst outreach making heart shapes with their hands", href: "/impact#ythirst", position: "center 42%" },
  { src: "/images/hero/ythirst-900-children.jpg", alt: "900 children and counting, supported through the Ythirst Project", href: "/impact#ythirst", fit: "contain", background: "#FDDB44" },
];

const VALUES = [
  { name: "Faith-driven", desc: "A business built on faith, run with integrity and care." },
  { name: "Indigenous quality", desc: "Premium products made right here in Lagos." },
  { name: "Community impact", desc: "25% of our profits fund the Ythirst Project." },
  { name: "Wholesome nutrition", desc: "Real ingredients, made fresh for every order." },
];

export default async function Home() {
  const [products, totals] = await Promise.all([listProducts({ featuredOnly: true }), getBoxTotals()]);

  return (
    <>
      <section className="hero">
        <HeroCarousel slides={HERO_SLIDES} sizes="100vw" />
        <div className="hero-caption">
          <span className="kicker">25% of our profits go to children in need</span>
          <h1 className="hero-h1">Premium Greek yogurt, granola &amp; energy bars</h1>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-h2">Our products</h2>
          <Link className="text-link" href="/products">
            View all products
          </Link>
        </div>
        <div className={gridClass(products.length)}>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} eager={i < 4} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="split">
          <div className="split-media">
            <Image src="/images/products/parfait-chocolate.jpg" alt="Chocolate and peanut Greek yogurt parfait" fill sizes="(max-width: 860px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </div>
          <div className="split-text">
            <h2 className="section-h2">About Yogurmac</h2>
            <p className="lead">
              We make every order fresh, by hand, right here in Nigeria. There is no warehouse of stock on a shelf: your yogurt, granola
              or energy bars are made for you after you order.
            </p>
            <dl className="values-list">
              {VALUES.map((v) => (
                <div key={v.name}>
                  <dt>{v.name}</dt>
                  <dd>{v.desc}</dd>
                </div>
              ))}
            </dl>
            <Link className="btn btn-outline" href="/our-story">
              Learn more about us
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="split split-reverse">
          <div className="split-media">
            <Image src="/images/hero/ythirst-outreach.jpg" alt="Children at a Ythirst outreach making heart shapes with their hands" fill sizes="(max-width: 860px) 100vw, 50vw" style={{ objectFit: "cover", objectPosition: "center 40%" }} />
          </div>
          <div className="split-text">
            <span className="kicker kicker-leaf">The Ythirst Project</span>
            <h2 className="section-h2">Sharing love with children across Lagos.</h2>
            <p className="lead">
              Every quarter we visit public schools across Lagos with food, refreshments, gifts and joyful experiences for underserved children.
              25% of our profits fund this outreach.
            </p>
            <ImpactStats />
            <Link className="text-link" href="/impact">
              See our business impact
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="panel panel-give">
          <div>
            <span className="kicker">Wellness subscription boxes</span>
            <h2 className="section-h2">Nourishment for you, your family or your team.</h2>
            <p className="lead">
              Solo, family, corporate and period care boxes, ordered once or delivered every day for as many days as you need.
            </p>
            <Link className="btn btn-lg" href="/impact#boxes">
              See the boxes
            </Link>
          </div>
          <LiveCounter initial={totals} />
        </div>
      </section>
    </>
  );
}
