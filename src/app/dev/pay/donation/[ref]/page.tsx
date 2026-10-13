import { notFound } from "next/navigation";
import { SimulatedPay } from "@/components/SimulatedPay";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { isSimulatedPayments } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// LOCAL DEVELOPMENT ONLY: stands in for the Paystack popup.
export default async function SimulatedDonationPayment({ params }: PageProps<"/dev/pay/donation/[ref]">) {
  if (!isSimulatedPayments()) notFound();
  const { ref } = await params;
  const d = await db.donation.findUnique({ where: { reference: ref } });
  if (!d || d.status !== "PENDING") notFound();
  return (
    <>
      <div className="sim-banner">Test mode — simulated Paystack payment. No real money moves.</div>
      <div className="confirm">
        <h1 className="page-h1">Give {formatNaira(d.amount.toString())}</h1>
        <p className="prose" style={{ margin: "12px 0 20px" }}>
          Donation {d.reference} for {d.children} {d.children === 1 ? "child" : "children"}. This sends the same <code>charge.success</code> event Paystack
          would, through the real webhook processor.
        </p>
        <SimulatedPay body={{ type: "donation", reference: d.reference }} cancelHref="/partner" />
      </div>
    </>
  );
}
