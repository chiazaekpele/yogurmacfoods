import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/AccountForms";
import { getCustomer, safeNext } from "@/lib/customer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const NOTICES: Record<string, string> = {
  reset: "Your password has been changed. Sign in with your new password.",
  verify: "Your account is created. Check your email to verify it, then sign in.",
};

export default async function SignInPage({ searchParams }: PageProps<"/account/sign-in">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCustomer()) redirect(next);
  const notice = typeof sp.notice === "string" ? NOTICES[sp.notice] : undefined;
  const fromCheckout = next.startsWith("/checkout");
  return (
    <div className="auth-wrap">
      <h1 className="page-h1">Sign in</h1>
      <p className="page-lede">{fromCheckout ? "Sign in to your account to place your order." : "Welcome back."}</p>
      {notice && (
        <div className="form-ok" role="status" style={{ marginTop: 18 }}>
          {notice}
        </div>
      )}
      <div className="auth-card">
        <SignInForm next={next} />
      </div>
      <p className="auth-alt">
        New to Yogurmac?{" "}
        <Link className="link" href={`/account/sign-up?next=${encodeURIComponent(next)}`}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
