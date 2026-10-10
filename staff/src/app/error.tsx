"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="auth">
      <div className="auth-card card">
        <h1 className="h1">Something went wrong</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Nothing you entered has been lost. Please try again in a moment.
        </p>
        <button className="btn" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </div>
  );
}
