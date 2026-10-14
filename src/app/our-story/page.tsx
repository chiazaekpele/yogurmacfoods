import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our story",
  description: "Yogurmac Foods is a faith-driven indigenous food brand making premium Greek yogurt, granola and energy bars in Lagos.",
};

const VALUES = [
  { name: "Faith-driven", desc: "Integrity and care in everything we make." },
  { name: "Indigenous quality", desc: "Premium products, proudly Lagos-made." },
  { name: "Community impact", desc: "25% of our profits fund the Ythirst Project." },
  { name: "Wholesome nutrition", desc: "Real ingredients, made fresh for every order." },
];

export default function OurStoryPage() {
  return (
    <>
      <div className="page-head">
        <span className="kicker">Our story</span>
        <h1 className="page-h1">Wholesome food. Faith-driven purpose.</h1>
        <p className="page-lede">
          Yogurmac Foods Limited is a faith-driven indigenous food brand crafting premium Greek yogurt, granola and energy bars, made to
          order in Lagos.
        </p>
      </div>

      <section className="section">
        <div className="split">
          <div className="split-media">
            <Image src="/images/products/greek-yogurt-sweetened.jpg" alt="Yogurmac natural Greek yogurt, 500ml" fill sizes="(max-width: 860px) 100vw, 50vw" style={{ objectFit: "cover" }} loading="eager" fetchPriority="high" />
          </div>
          <div className="split-text">
            <h2 className="section-h2">Who we are</h2>
            <div className="prose">
              <p>We make every order fresh, by hand, right here in Nigeria. There is no warehouse of stock waiting on a shelf: your yogurt, granola or energy bars are made for you after you order.</p>
              <p>Our faith shapes how we work: honest ingredients, fair dealing, and a business that gives back to the community it serves.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="values">
        <h2 className="section-h2">What we stand for</h2>
        <div className="value-grid">
          {VALUES.map((v) => (
            <div className="value-card" key={v.name}>
              <h3>{v.name}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="panel panel-leaf">
          <div>
            <span className="kicker kicker-leaf">The Ythirst Project</span>
            <h2 className="section-h2">Sharing love with children across Lagos.</h2>
            <p className="lead">Ythirst is our quarterly school outreach to underserved children in Lagos, funded by 25% of our profits.</p>
          </div>
          <Link className="btn btn-lg" href="/impact">
            See our business impact
          </Link>
        </div>
      </section>
    </>
  );
}
