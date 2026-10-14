import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/AccountForms";
import { getCustomer, safeNext } from "@/lib/customer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: PageProps<"/account/sign-up">) {
  const next = safeNext((await searchParams).next);
  if (await getCustomer()) redirect(next);
  return (
    <div className="auth-wrap">
      <h1 className="page-h1">Create an account</h1>
      <p className="page-lede">
        {next.startsWith("/checkout")
          ? "You need an account to place an order. It saves your delivery details and keeps your order history in one place."
          : "Save your delivery details and see your orders and gifts in one place."}
      </p>
      <div className="auth-card">
        <SignUpForm next={next} />
      </div>
      <p className="auth-alt">
        Already have an account?{" "}
        <Link className="link" href={`/account/sign-in?next=${encodeURIComponent(next)}`}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
