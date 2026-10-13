import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { DONATION_REF_PATTERN } from "@/lib/order-id";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

export default async function ThankYouPage({ searchParams }: PageProps<"/partner/thank-you">) {
  const ref = (await searchParams).ref;
  const donation =
    typeof ref === "string" && DONATION_REF_PATTERN.test(ref)
      ? await db.donation.findUnique({ where: { reference: ref }, select: { children: true, amount: true, status: true, reference: true } })
      : null;
  const kids = donation ? `${donation.children} ${donation.children === 1 ? "child" : "children"}` : "";

  return (
    <div className="confirm">
      <div className="eyebrow">Thank you</div>
      <h1 className="page-h1">{donation ? `You’re supporting ${kids}.` : "Thank you for giving."}</h1>
      <p className="prose" style={{ marginTop: 14 }}>
        {donation ? (
          <>
            Your gift of <strong>{formatNaira(donation.amount.toString())}</strong> goes to Ythirst outreach to children across Lagos.{" "}
            {donation.status === "PAID"
              ? "A receipt is on its way to your email."
              : "We’re confirming your payment now; the live counter updates within a few seconds, and your receipt follows by email."}
          </>
        ) : (
          "Your gift goes to Ythirst outreach to children across Lagos. A receipt is on its way to your email."
        )}
      </p>
      {donation && <p className="small" style={{ marginTop: 10, color: "var(--muted)" }}>Reference {donation.reference}</p>}
      <p style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn btn-ghost" href="/partner">
          See the live counter →
        </Link>
        <Link className="btn btn-ghost" href="/ythirst">
          About Ythirst →
        </Link>
      </p>
    </div>
  );
}
