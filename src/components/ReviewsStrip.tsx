"use client";

import { usePathname } from "next/navigation";
import type { PublicReview } from "@/lib/chrome-data";
import { isAdminPage, isBarePage } from "@/lib/chrome";

// Approved customer reviews, just above the footer on every shop page.
export function ReviewsStrip({ reviews }: { reviews: PublicReview[] }) {
  const pathname = usePathname();
  if (!reviews.length || isAdminPage(pathname) || isBarePage(pathname)) return null;
  return (
    <section className="reviews" aria-labelledby="reviews-h">
      <h2 className="section-h2" id="reviews-h">
        What our customers say
      </h2>
      <div className="reviews-row">
        {reviews.map((r) => (
          <figure className="review" key={r.id}>
            <div className="review-stars" aria-label={`${r.rating} out of 5 stars`}>
              {"★".repeat(r.rating)}
              <span aria-hidden>{"★".repeat(5 - r.rating)}</span>
            </div>
            <blockquote>{r.body}</blockquote>
            <figcaption>{r.displayName}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
