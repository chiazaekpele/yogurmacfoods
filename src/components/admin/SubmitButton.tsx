"use client";

import { useFormStatus } from "react-dom";

// Disables itself while its form submits, so a double click can't send twice.
export function SubmitButton({
  children,
  className = "btn",
  pendingText = "Saving…",
  disabled,
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={disabled || pending}
      name={name}
      value={value}
      onClick={confirm ? (e) => !window.confirm(confirm) && e.preventDefault() : undefined}
    >
      {pending ? pendingText : children}
    </button>
  );
}
