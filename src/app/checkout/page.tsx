import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { LAGOS_LGAS } from "@/lib/lgas";
import { isSimulatedPayments } from "@/lib/paystack";
import { getShippingRates } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const rates = await getShippingRates();
  const lgas = LAGOS_LGAS.map((name) => ({ name, fee: rates[name] ?? null }));
  return (
    <>
      <div className="page-head dots">
        <h1 className="page-h1">Checkout</h1>
        <p className="page-lede">No account needed. You will get an Order ID and a confirmation email once payment is complete.</p>
      </div>
      <CheckoutForm
        lgas={lgas}
        simulated={isSimulatedPayments()}
        paystackPublicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""}
      />
    </>
  );
}
