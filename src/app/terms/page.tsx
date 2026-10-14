import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms & Conditions", description: "Yogurmac Foods Limited subscription terms and conditions." };

// Text supplied by Yogurmac (14 Oct 2026); spelling and grammar corrected only.
export default function TermsPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-h1">Terms &amp; Conditions</h1>
        <p className="page-lede">Yogurmac Foods Limited subscription terms and conditions. Last updated June 2026.</p>
      </div>
      <section className="section">
        <div className="prose">
          <p>
            Welcome to the Yogurmac Foods Limited subscription family! By subscribing to any of our product or community outreach partnership
            packages, you agree to the following terms and conditions. Please read them carefully.
          </p>

          <h2>1. Subscription overview and commitment</h2>
          <ul>
            <li>
              <strong>The service:</strong> your subscription enrols you in a recurring delivery programme for our premium products (Greek
              yogurt, granola, energy bars) and/or a recurring financial partnership supporting the Ythirst Community Project outreach.
            </li>
            <li>
              <strong>The mission:</strong> a portion of all subscription revenue directly funds our quarterly outreach to public primary
              schools across the country, providing free nutrition to low-income pupils.
            </li>
          </ul>

          <h2>2. Billing, payments and automatic renewal</h2>
          <ul>
            <li>
              <strong>Billing cycle:</strong> subscriptions are billed on a recurring basis depending on your selected tier (for example
              monthly, quarterly or bi-annually).
            </li>
            <li>
              <strong>Payment processing:</strong> payments are processed automatically and securely through our integrated third-party
              payment gateway (Paystack).
            </li>
            <li>
              <strong>Authorisation:</strong> by entering your card details, you authorise Yogurmac Foods Limited to charge your account
              automatically at the start of each renewal cycle until you cancel or pause your plan.
            </li>
          </ul>

          <h2>3. Delivery, schedules and logistics for yogurt and other perishables (Lagos State only)</h2>
          <ul>
            <li>
              <strong>Delivery schedule:</strong> product deliveries are dispatched according to the frequency specified in your chosen
              package.
            </li>
            <li>
              <strong>Delivery areas:</strong> we currently deliver strictly within Lagos State. Please make sure your delivery address and
              phone number are accurate and reachable.
            </li>
            <li>
              <strong>Failed deliveries:</strong> our dispatch team will attempt delivery up to two (2) times. If a delivery fails because the
              subscriber is unreachable or the address is incorrect, re-delivery fees may apply.
            </li>
          </ul>

          <h2>4. Cancellation and pausing</h2>
          <ul>
            <li>
              <strong>Flexibility:</strong> you are in full control of your subscription. You can pause or cancel it at any time.
            </li>
            <li>
              <strong>Deadlines:</strong> to avoid being charged for the next cycle, cancellation or pause requests must be made through your
              online account or by email at least three (3) business days before your next scheduled billing date.
            </li>
            <li>
              <strong>Refunds:</strong> once a renewal payment has been processed, refunds for that period cannot be issued. You will still
              receive all products or impact updates due for that cycle.
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
              <strong>Price changes:</strong> Yogurmac Foods Limited reserves the right to adjust subscription pricing to reflect changing
              ingredient and production costs in Nigeria.
            </li>
            <li>
              <strong>Notice:</strong> subscribers will be given at least fourteen (14) days’ notice by email before any price or package
              change takes effect, so you have time to plan for your renewal.
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
