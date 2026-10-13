import type { Metadata } from "next";
import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";

export const metadata: Metadata = {
  title: "Our story",
  description: "Yogurmac Foods is a faith-driven indigenous food brand making premium Greek yogurt, granola and energy bars in Lagos.",
};

export default function OurStoryPage() {
  return (
    <>
      <div className="page-head dots">
        <div className="eyebrow">Our story</div>
        <h1 className="page-h1">Wholesome food. Faith-driven purpose.</h1>
        <p className="page-lede">
          Yogurmac Foods Limited is a faith-driven indigenous food brand crafting premium Greek yogurt, granola and energy
          bars, made to order in Lagos.
        </p>
      </div>

      <div className="pd" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="pd-gallery">
          <div className="pd-main" style={{ height: 380 }}>
            <ProductImage src="/images/products/greek-yogurt-sweetened.jpg" alt="Yogurmac natural Greek yogurt, 500ml" sizes="(max-width: 860px) 100vw, 50vw" eager />
          </div>
        </div>
        <div className="section" style={{ borderBottom: "none" }}>
          <h2 className="section-h2">Who we are</h2>
          <div className="prose">
            <p>We make every order fresh, by hand, right here in Nigeria. There is no warehouse of stock waiting on a shelf — your yogurt, granola or energy bars are made for you after you order.</p>
            <p>Our faith shapes how we work: honest ingredients, fair dealing, and a business that gives back to the community it serves.</p>
          </div>
          <div className="note-box" style={{ marginTop: 16 }}>
            Full brand identity statement and mission copy to be supplied by Yogurmac.
          </div>
        </div>
      </div>

      <section className="section" id="values">
        <h2 className="section-h2">What we stand for</h2>
        <div className="prose">
          <ul>
            <li><strong>Faith-driven</strong> — integrity and care in everything we make.</li>
            <li><strong>Indigenous quality</strong> — premium products, proudly Lagos-made.</li>
            <li><strong>Community impact</strong> — donations fund the Ythirst Community Project.</li>
            <li><strong>Wholesome nutrition</strong> — real ingredients, made fresh for every order.</li>
          </ul>
        </div>
      </section>

      <section className="ythirst">
        <div className="yt-eye">The Ythirst Community Project</div>
        <h2 className="yt-h2">Supporting young children in need across Lagos.</h2>
        <p className="yt-note">Ythirst is our community outreach, funded entirely by donations — never by product sales.</p>
        <Link className="yt-lnk" href="/ythirst">
          Discover Ythirst →
        </Link>
      </section>
    </>
  );
}
