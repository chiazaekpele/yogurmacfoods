import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy", description: "How Yogurmac Foods collects and uses your personal data." };

const CONTACT = "privacy@yogurmacfoods.com";

export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="page-head dots">
        <div className="eyebrow">Legal</div>
        <h1 className="page-h1">Privacy policy</h1>
        <p className="page-lede">How Yogurmac Foods Limited handles your personal data, in line with the Nigeria Data Protection Regulation (NDPR).</p>
      </div>
      <section className="section">
        <div className="note-box" style={{ marginBottom: 20 }}>
          Draft for Yogurmac’s review. Retention period and contact details must be confirmed before launch.
        </div>
        <div className="prose">
          <h2>What we collect</h2>
          <p>When you place an order we collect your full name, phone number, email address and delivery address (LGA, exact address and an optional landmark). When you become a partner we collect your name and email address.</p>
          <p>Payments are processed by Paystack. We never see or store your card details.</p>

          <h2>Why we collect it</h2>
          <ul>
            <li>To make and deliver your order, including our rider calling you on delivery.</li>
            <li>To send your order confirmation and delivery updates by email or WhatsApp.</li>
            <li>To manage partner subscriptions and send confirmation of your gifts.</li>
          </ul>
          <p>We do not sell your data, and we do not use it for advertising. Our production staff only see what needs to be made, never your contact details.</p>

          <h2>How long we keep it</h2>
          <p>We keep order records for as long as needed for order history and our legal and accounting obligations. [Retention period to be confirmed by Yogurmac.]</p>

          <h2>Your rights and deleting your data</h2>
          <p>You can ask to see the personal data we hold about you, or ask us to delete it, by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a> with your Order ID if you have one. When you ask for deletion, we remove your name and contact details from our records and keep only anonymous order totals for our accounts.</p>

          <h2 id="cookies">Cookies</h2>
          <p>We only use what the shop needs to work: your cart is stored in your own browser, and one cookie remembers that you have seen our cookie notice. We use no tracking or advertising cookies.</p>

          <h2>Contact</h2>
          <p>For any question about your data, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
        </div>
      </section>
    </>
  );
}
