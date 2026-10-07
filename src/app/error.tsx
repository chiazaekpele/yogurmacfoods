"use client";

import { useEffect } from "react";

// Shown when a page fails, for example if the database is unreachable (PRD §13).
// No stack traces or technical details reach the customer.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="confirm">
      <h1 className="page-h1">We’ll be right back</h1>
      <p className="prose" style={{ margin: "12px 0 20px" }}>
        The shop is having a short break for maintenance. Please try again in a few minutes. Your cart is saved.
      </p>
      <button className="btn" onClick={() => retry()}>
        Try again
      </button>
    </div>
  );
}
