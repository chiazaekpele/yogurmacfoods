import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL as CONTACT } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", description: "How Yogurmac Foods protects and uses your personal data." };

// Commitments supplied by Yogurmac (14 Oct 2026); the sections after them cover
// what the NDPR requires us to state.
export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-h1">Privacy policy</h1>
        <p className="page-lede">Our privacy and security commitment to you, in line with the Nigeria Data Protection Regulation (NDPR).</p>
      </div>
      <section className="section">
        <div className="prose">
          <h2>Your information stays with us</h2>
          <p>
            All customer information is kept safe and is never shared publicly. We use it internally to fill orders, contact customers and keep
            a line of communication open. Your information is housed on secure servers. Within Yogurmac Foods, access to your data is strictly
            limited to authorised personnel who need it to package your orders, arrange delivery logistics or handle your customer service
            enquiries.
          </p>

          <h2>Payment security</h2>
          <p>
            We do not store or have access to your credit or debit card details. All online payments are securely processed through Paystack,
            an encrypted, industry-standard payment gateway.
          </p>

          <h2>No spam, no selling</h2>
          <p>
            We have a zero-spam policy. Your personal details, including your name, phone number and delivery address, will never be sold,
            rented, leased or traded to outside marketing agencies or third parties.
          </p>

          <h2>Opt-out and update rights</h2>
          <p>
            You are always in control of your data. If you subscribe to our newsletter or outreach updates, you can opt out at any time by
            clicking the “Unsubscribe” link at the bottom of our emails, or by contacting us directly to update or delete your profile.
          </p>

          <h2>What we collect</h2>
          <p>
            When you place an order we collect your full name, phone number, email address and delivery address (LGA, exact address and an
            optional landmark). Your account holds your name, email address and password (stored securely by our login provider, never by us
            in readable form), plus the delivery details you save so they are filled in at checkout.
          </p>

          <h2>How long we keep it, and deleting it</h2>
          <p>
            We keep order records for as long as needed for your order history and our legal and accounting obligations. You can ask to see
            the personal data we hold about you, or ask us to delete it, by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. When you ask
            for deletion, we remove your name and contact details and keep only anonymous order totals for our accounts.
          </p>

          <h2 id="cookies">Cookies</h2>
          <p>
            We only use what the shop needs to work: your cart is stored in your own browser, signing in uses a secure session cookie, and one
            cookie remembers that you have seen our cookie notice. We use no tracking or advertising cookies.
          </p>

          <h2>Contact</h2>
          <p>
            For any question about your data, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also our{" "}
            <Link href="/terms">Terms &amp; Conditions</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
