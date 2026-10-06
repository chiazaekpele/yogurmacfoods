import { notFound } from "next/navigation";
import { SimulatedPay } from "@/components/SimulatedPay";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { isSimulatedPayments } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// LOCAL DEVELOPMENT ONLY: stands in for the Paystack popup.
export default async function SimulatedOrderPayment({ params }: PageProps<"/dev/pay/[orderId]">) {
  if (!isSimulatedPayments()) notFound();
  const { orderId } = await params;
  const pending = await db.pendingCheckout.findUnique({ where: { orderId } });
  if (!pending) notFound();
  return (
    <>
      <div className="sim-banner">Test mode — simulated Paystack payment. No real money moves.</div>
      <div className="confirm">
        <h1 className="page-h1">Pay {formatNaira(pending.total.toString())}</h1>
        <p className="prose" style={{ margin: "12px 0 20px" }}>
          Order {pending.orderId} for {pending.customerEmail}. This sends the same <code>charge.success</code> event Paystack
          would, through the real webhook processor.
        </p>
        <SimulatedPay body={{ type: "order", orderId: pending.orderId }} cancelHref="/checkout" />
      </div>
    </>
  );
}
