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
          <h1 className="page-h1">Something went wrong</h1>
          <p className="prose" style={{ margin: "12px 0 20px" }}>
            This page didn’t load properly. Please try again; if it keeps happening, wait a minute and refresh. Your cart is saved.
          </p>
          <button className="btn" onClick={() => retry()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
