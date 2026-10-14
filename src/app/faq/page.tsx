import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ", description: "Delivery, payment, pick-up and product questions about Yogurmac Foods." };

// Answers supplied by Yogurmac (14 Oct 2026).
const FAQS: { q: string; a: string[] }[] = [
  {
    q: "Can I get same-day delivery?",
    a: [
      "Because all our products are made with maximum nutrition and freshness in mind, we do not use preservatives, especially in our yogurts. This helps preserve their natural probiotic benefits and wholesome quality. As a result, we produce in fresh batches as needed rather than keeping large quantities in storage.",
      "For this reason, we typically ask that you allow 2–3 working days for delivery. However, if we have a freshly made batch available, our delivery team will let you know, and your order may be delivered the same day.",
      "Your health and the freshness of every product remain our top priority.",
    ],
  },
  {
    q: "Can I pay on delivery?",
    a: [
      "At this time, we do not offer payment on delivery. Payment is required to confirm your order. Once payment has been received, your order will be processed and prepared for dispatch.",
      "This helps us process orders efficiently and maintain the freshness and quality of every product we deliver.",
    ],
  },
  {
    q: "Can I pick up my order?",
    a: [
      "Yes, you can pick up your order from one of our designated pick-up points. At the moment, our facility is dedicated solely to production and is not yet set up for customer walk-ins.",
      "We look forward to expanding our operations and hope to offer direct pick-up from our facility as we grow.",
    ],
  },
  {
    q: "What should I do if my yogurt arrives spilled?",
    a: [
      "We make every effort to prevent this by securely sealing our containers and making sure our delivery personnel handle your order with care, but unforeseen incidents can occasionally happen.",
      "If your yogurt arrives spilled, please take clear photos and a short video of the package while the dispatch rider is still present, and send them to our delivery team immediately. This lets us assess the situation promptly and provide an immediate response and a fair resolution.",
    ],
  },
  {
    q: "Are your products healthy?",
    a: [
      "Absolutely! All our products are thoughtfully crafted with your health and wellbeing in mind. We use wholesome, natural ingredients and are committed to high standards of quality and nutrition in everything we make.",
      "You can enjoy our products with confidence, knowing that every bite and sip is made with care, goodness and your health at heart.",
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-h1">Frequently asked questions</h1>
        <p className="page-lede">Delivery, payment, pick-up and our products.</p>
      </div>
      <section className="section">
        <div className="faq">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <div className="prose">
                {f.a.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
