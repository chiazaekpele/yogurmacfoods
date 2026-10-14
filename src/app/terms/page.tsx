import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms & Conditions", description: "Yogurmac Foods Limited terms and conditions for orders and wellness boxes." };

// Based on Yogurmac's text (14 Oct 2026). Recurring-billing terms removed on
// 14 Oct 2026: orders are one-off or daily boxes paid upfront, no auto-renewal.
export default function TermsPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-h1">Terms &amp; Conditions</h1>
        <p className="page-lede">Terms and conditions for orders and wellness boxes. Last updated October 2026.</p>
      </div>
      <section className="section">
        <div className="prose">
          <p>
            Welcome to the Yogurmac Foods Limited family! By placing an order for any of our products or wellness boxes, you agree to the
            following terms and conditions. Please read them carefully.
          </p>

          <h2>1. Your order</h2>
          <ul>
            <li>
              <strong>The service:</strong> you can order our premium products (Greek yogurt, granola, energy bars) and wellness boxes once,
              or have a wellness box delivered every day for the number of days you choose.
            </li>
            <li>
              <strong>The mission:</strong> 25% of our profits fund the Ythirst Project, our quarterly outreach to public primary schools,
              providing free nutrition to low-income pupils.
            </li>
          </ul>

          <h2>2. Payment</h2>
          <ul>
            <li>
              <strong>Paid upfront:</strong> every order, including every day of a daily wellness box, is paid in full at checkout. There are
              no automatic renewals or repeat charges.
            </li>
            <li>
              <strong>Payment processing:</strong> payments are processed securely through our third-party payment gateway (Paystack). We do
              not store your card details.
            </li>
          </ul>

          <h2>3. Delivery, schedules and logistics for yogurt and other perishables (Lagos State only)</h2>
          <ul>
            <li>
              <strong>Delivery schedule:</strong> orders are usually ready in 2–3 working days. A daily wellness box is delivered once a day
              for the number of days you chose.
            </li>
            <li>
              <strong>Delivery areas:</strong> we currently deliver strictly within Lagos State. Please make sure your delivery address and
              phone number are accurate and reachable.
            </li>
            <li>
              <strong>Failed deliveries:</strong> our dispatch team will attempt delivery up to two (2) times. If a delivery fails because the
              customer is unreachable or the address is incorrect, re-delivery fees may apply.
            </li>
          </ul>

          <h2>4. Changes and refunds</h2>
          <ul>
            <li>
              <strong>Changes:</strong> to change delivery details for an order, contact us at least three (3) business days before the
              delivery date.
            </li>
            <li>
              <strong>Refunds:</strong> once a payment has been processed, refunds cannot be issued. You will still receive all products due
              under that order.
            </li>
          </ul>

          <h2>5. Product freshness and allergies</h2>
          <ul>
            <li>
              <strong>Freshness and integrity:</strong> our products are fresh and nutrient-dense. On delivery, yogurt must be refrigerated
              immediately. Yogurmac Foods is not liable for spoilage caused by improper handling or storage after a successful delivery.
            </li>
            <li>
              <strong>Allergies:</strong> our snacks are processed in a dairy (yogurt) facility and contain oats and nuts (granola and bars).
              Please review product ingredients carefully if you have dietary restrictions.
            </li>
          </ul>

          <h2>6. Changes to pricing or packages</h2>
          <ul>
            <li>
              <strong>Price changes:</strong> Yogurmac Foods Limited reserves the right to adjust prices to reflect changing ingredient and
              production costs in Nigeria. New prices apply to new orders only; orders already paid for are not affected.
            </li>
          </ul>

          <p>
            See also our <Link href="/privacy-policy">Privacy policy</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
