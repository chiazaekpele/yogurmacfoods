import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="auth-wrap">
      <h1 className="page-h1">Reset your password</h1>
      <p className="page-lede">Enter your email and we’ll send you a link to choose a new password.</p>
      <div className="auth-card">
        <ForgotForm />
      </div>
      <p className="auth-alt">
        <Link className="link" href="/account/sign-in">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
