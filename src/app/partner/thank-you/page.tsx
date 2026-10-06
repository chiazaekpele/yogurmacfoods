import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

export default async function ThankYouPage({ searchParams }: PageProps<"/partner/thank-you">) {
  const tier = (await searchParams).tier;
  return (
    <div className="confirm">
      <div className="eyebrow">Thank you</div>
      <h1 className="page-h1">Welcome, partner.</h1>
      <p className="prose" style={{ marginTop: 14 }}>
        Your {typeof tier === "string" && tier ? <strong>{tier}</strong> : "partnership"} is set up. A confirmation email is
        on its way. Every month, your gift funds Ythirst outreach to children across Lagos.
      </p>
      <p style={{ marginTop: 24 }}>
        <Link className="btn btn-ghost" href="/ythirst">
          See the impact →
        </Link>
      </p>
    </div>
  );
}
