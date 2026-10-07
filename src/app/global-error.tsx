"use client";

import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout when the layout itself fails, so it renders its own <html>.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-NG">
      <body>
        <div className="confirm">
          <h1 className="page-h1">We’ll be right back</h1>
          <p className="prose" style={{ margin: "12px 0 20px" }}>
            The shop is having a short break for maintenance. Please try again in a few minutes. Your cart is saved.
          </p>
          <button className="btn" onClick={() => retry()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
