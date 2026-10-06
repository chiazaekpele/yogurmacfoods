import { notFound } from "next/navigation";
import { SimulatedPay } from "@/components/SimulatedPay";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { isSimulatedPayments } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// LOCAL DEVELOPMENT ONLY: stands in for the Paystack subscription popup.
export default async function SimulatedSubscriptionPayment({ searchParams }: PageProps<"/dev/pay/subscription">) {
  if (!isSimulatedPayments()) notFound();
  const { tierId, name, email } = await searchParams;
  if (typeof tierId !== "string" || typeof name !== "string" || typeof email !== "string") notFound();
  const tier = await db.subscriptionTier.findFirst({ where: { id: tierId, isActive: true } });
  if (!tier) notFound();
  return (
    <>
      <div className="sim-banner">Test mode — simulated Paystack subscription. No real money moves.</div>
      <div className="confirm">
        <h1 className="page-h1">
          {tier.name}: {formatNaira(tier.monthlyAmount.toString())}/month
        </h1>
        <p className="prose" style={{ margin: "12px 0 20px" }}>
          For {name} ({email}). This sends <code>charge.success</code> and <code>subscription.create</code> through the
          real webhook processor.
        </p>
        <SimulatedPay body={{ type: "subscription", tierId, name, email }} cancelHref="/partner" />
      </div>
    </>
  );
}
