import type { Metadata } from "next";
import { GiveForm } from "@/components/GiveForm";
import { LiveCounter } from "@/components/LiveCounter";
import { Naira } from "@/components/Naira";
import { getGivingTotals } from "@/lib/giving";
import { isSimulatedPayments } from "@/lib/paystack";

// The counter refreshes itself in the browser; the page only seeds it.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Give",
  description: "Give ₦500 to support a child through the Ythirst Community Project in Lagos.",
};

export default async function GivePage() {
  const totals = await getGivingTotals();
  return (
    <>
      <div className="page-head give-head" style={{ background: "var(--gold)" }}>
        <div>
          <div className="eyebrow" style={{ color: "#3D2500" }}>
            The Ythirst Community Project
          </div>
          <h1 className="page-h1">
            <Naira value={500} /> supports one child.
          </h1>
          <p className="page-lede" style={{ color: "#3D2500" }}>
            Give once, for as many children as you like. Every gift goes to Ythirst outreach to children in need across Lagos.
            This is a donation: no products are delivered.
          </p>
        </div>
        <LiveCounter initial={totals} />
      </div>
      <div className="give-form">
        <GiveForm simulated={isSimulatedPayments()} />
      </div>
    </>
  );
}
