import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { requireCustomer } from "@/lib/customer";
import { LAGOS_LGAS } from "@/lib/lgas";
import { isSimulatedPayments } from "@/lib/paystack";
import { getShippingRates } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  // Paying requires an account (13 Oct 2026).
  const customer = await requireCustomer("/checkout");
  const rates = await getShippingRates();
  const lgas = LAGOS_LGAS.map((name) => ({ name, fee: rates[name] ?? null }));
  return (
    <>
      <div className="page-head">
        <h1 className="page-h1">Checkout</h1>
        <p className="page-lede">Your saved details are filled in. You will get an Order ID and a confirmation email once payment is complete.</p>
      </div>
      <CheckoutForm
        lgas={lgas}
        simulated={isSimulatedPayments()}
        initial={{
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone ?? "",
          lga: customer.lga ?? "",
          exactAddress: customer.exactAddress ?? "",
          landmark: customer.landmark ?? "",
        }}
      />
    </>
  );
}
