import type { Metadata } from "next";
import { SubscribeForm } from "@/components/SubscribeForm";
import { listActiveTiers } from "@/lib/catalog";
import { isSimulatedPayments } from "@/lib/paystack";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Partner with us",
  description: "Give monthly to fund the Ythirst Community Project's outreach to children in Lagos.",
};

export default async function PartnerPage() {
  const tiers = await listActiveTiers();
  return (
    <>
      <div className="page-head" style={{ background: "var(--gold)" }}>
        <div className="eyebrow" style={{ color: "#3D2500" }}>
          Partner with us
        </div>
        <h1 className="page-h1">Subscribe monthly. Support a child in need.</h1>
        <p className="page-lede" style={{ color: "#3D2500" }}>
          Your partnership funds the Ythirst Community Project directly. This is a donation — no products are delivered.
          Paystack charges your card monthly, and you can cancel any time.
        </p>
      </div>
      {tiers.length ? (
        <SubscribeForm
          tiers={tiers.map((t) => ({ id: t.id, name: t.name, description: t.description, monthlyAmount: t.monthlyAmount }))}
          simulated={isSimulatedPayments()}
        />
      ) : (
        <p className="empty">Partnership tiers are coming soon.</p>
      )}
    </>
  );
}
