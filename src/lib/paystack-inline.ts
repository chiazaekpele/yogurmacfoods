"use client";

// Paystack InlineJS v2. The transaction is initialised on the server, so the
// browser only resumes it with the access code and cannot change the amount.
// Verify the method names against Paystack's current InlineJS docs when live keys
// are first used (TRD §6.1).

type PaystackPopInstance = {
  resumeTransaction(
    accessCode: string,
    callbacks: { onSuccess?: (tx: unknown) => void; onCancel?: () => void; onError?: (e: unknown) => void },
  ): void;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

const SRC = "https://js.paystack.co/v2/inline.js";

function loadScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Paystack"));
    document.head.appendChild(s);
  });
}

export async function openPaystack(_publicKey: string, accessCode: string): Promise<"success" | "cancelled"> {
  await loadScript();
  return new Promise((resolve, reject) => {
    const popup = new window.PaystackPop!();
    popup.resumeTransaction(accessCode, {
      onSuccess: () => resolve("success"),
      onCancel: () => resolve("cancelled"),
      onError: (e) => reject(e),
    });
  });
}
