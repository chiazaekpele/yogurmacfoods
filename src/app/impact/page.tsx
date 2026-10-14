import type { Metadata } from "next";
import Image from "next/image";
import { ImpactStats } from "@/components/ImpactStats";
import { LiveCounter } from "@/components/LiveCounter";
import { ProductCard } from "@/components/ProductCard";
import { gridClass, listProducts } from "@/lib/catalog";
import { getBoxTotals } from "@/lib/giving";

// Impact numbers and box sales change; refresh at least every minute.
export const revalidate = 60;
export const metadata: Metadata = {
  title: "Ythirst",
  description:
    "Nourishing lives, preserving nature, sharing love. 25% of Yogurmac's profits fund the Ythirst Project's school outreaches to children in Lagos.",
};

// Copy supplied by Yogurmac, 13 Oct 2026.
export default async function ImpactPage() {
  const [boxes, totals] = await Promise.all([listProducts({ boxesOnly: true }), getBoxTotals()]);
  return (
    <>
      <div className="page-head page-head-leaf">
        <span className="kicker kicker-leaf">Business Impact</span>
        <h1 className="page-h1">Nourishing Lives. Preserving Nature. Sharing Love.</h1>
        <p className="page-lede">
          Good food for you, and a share of every naira we earn for children who need it most. 25% of our profits fund the Ythirst
          Project.
        </p>
      </div>

      <section className="section">
        <div className="split">
          <div className="split-text">
            <span className="kicker">Our executive summary</span>
            <div className="prose">
              <p>
                At Yogurmac Foods Limited, we believe food should be more than delicious. It should nourish the body and, as far as its natural
                properties allow, support the body’s wellbeing. This belief shapes everything we do, from the ingredients we select to the
                products we create.
              </p>
              <p>
                We believe in preserving the natural integrity of food as much as possible, avoiding unnecessary chemical additives, excessive
                fillers and other ingredients that compromise its natural goodness. Our approach is simple: let nature do more of what it was
                designed to do. By prioritising thoughtfully selected ingredients and mindful preparation, we create delicious, convenient food
                options that bring nourishment and enjoyment into everyday life.
              </p>
              <p>
                From our varieties of Greek yogurt and drinking yoghurt, our granola to our energy bars, parfaits, overnight oats and wholesome
                snacks, every product reflects our commitment to quality, food integrity and mindful nourishment. When you choose Yogurmac Foods
                Limited, you are choosing more than a food product. You are choosing care in what you consume, confidence in the ingredients we
                use, and greater peace of mind about nourishing yourself and your loved ones.
              </p>
            </div>
          </div>
          <div className="split-media">
            <Image src="/images/products/parfait-classic.jpg" alt="Yogurmac Greek yogurt parfait" fill sizes="(max-width: 860px) 100vw, 50vw" style={{ objectFit: "cover" }} loading="eager" fetchPriority="high" />
          </div>
        </div>
      </section>

      <section className="section" id="ythirst">
        <div className="split split-reverse">
          <div className="split-media">
            <Image src="/images/hero/ythirst-outreach.jpg" alt="Children at a Ythirst school outreach making heart shapes with their hands" fill sizes="(max-width: 860px) 100vw, 50vw" style={{ objectFit: "cover", objectPosition: "center 40%" }} />
          </div>
          <div className="split-text">
            <span className="kicker kicker-leaf">The Ythirst Project</span>
            <h2 className="section-h2">Nourishment as an expression of love.</h2>
            <div className="prose">
              <p>
                Our purpose extends beyond the food we make. Through our quarterly school outreaches, we share the love of Christ with underserved
                children in public schools across Lagos, providing food, refreshments, gifts and joyful experiences that remind them they are
                valued and loved.
              </p>
              <p>
                Since 30 March 2023, we have reached over 900 children through 18 outreaches across four schools. We dedicate 25% of our profits
                to supporting this mission and extending our reach to more children.
              </p>
            </div>
            <ImpactStats />
          </div>
        </div>
      </section>

      <section className="section" id="boxes">
        <div className="section-head">
          <div>
            <span className="kicker">Wellness subscription boxes</span>
            <h2 className="section-h2">Nourishment for you, your family or your team.</h2>
            <p className="lead">Order a box once, or have one delivered every day for as many days as you need.</p>
          </div>
        </div>
        {boxes.length ? (
          <div className={gridClass(boxes.length)}>
            {boxes.map((p, i) => (
              <ProductCard key={p.id} product={p} eager={i < 4} />
            ))}
          </div>
        ) : (
          <p className="lead">Our wellness boxes are coming soon.</p>
        )}
        <div className="impact-counter">
          <LiveCounter initial={totals} />
        </div>
      </section>

      <section className="section">
        <div className="panel panel-leaf">
          <div>
            <p className="lead">
              At Yogurmac Foods Limited, we bring together wholesome nourishment, thoughtful food choices and meaningful impact. Whether you are
                choosing our products for yourself, your family or your working week, you are joining a community that believes in caring for
                people from the inside out, and sharing that care with children who need it most.
            </p>
            <p className="impact-signoff">Yogurmac Foods Limited — Good Food. Greater Impact.</p>
          </div>
        </div>
      </section>
    </>
  );
}
