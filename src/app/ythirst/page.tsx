import type { Metadata } from "next";
import Link from "next/link";
import { ImpactStats } from "@/components/ImpactStats";

// Impact numbers are updated by the admin; refresh at least every 5 minutes.
export const revalidate = 300;
export const metadata: Metadata = {
  title: "The Ythirst Community Project",
  description: "Ythirst supports young children in need across Lagos, funded entirely by Yogurmac partners.",
};

export default function YthirstPage() {
  return (
    <>
      <section className="ythirst" style={{ borderTop: "none" }}>
        <div className="yt-eye">The Ythirst Community Project</div>
        <h1 className="yt-h2" style={{ fontSize: 44 }}>
          Supporting young children in need across Lagos.
        </h1>
        <div className="yt-funding">Funded entirely by our partner subscriptions &amp; donations — not product sales</div>
        <ImpactStats />
      </section>

      <section className="section">
        <h2 className="section-h2">What an outreach looks like</h2>
        <div className="prose">
          <p>Our team visits schools and communities across Lagos to support young children in need. Every visit is funded by the people and organisations who partner with us monthly.</p>
        </div>
        <div className="note-box" style={{ marginTop: 16 }}>
          Full Ythirst mission narrative and outreach description to be supplied by Yogurmac.
        </div>
      </section>

      <div className="partner">
        <div className="pt-l">
          <h2 className="pt-h2">Join the mission. Become a partner.</h2>
          <p className="pt-sub">A monthly gift funds outreach visits, school by school.</p>
        </div>
        <div className="pt-r" style={{ justifyContent: "center" }}>
          <Link className="btn-pt" href="/partner">
            Choose a giving tier →
          </Link>
        </div>
      </div>
    </>
  );
}
