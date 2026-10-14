import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/AccountForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: PageProps<"/account/reset">) {
  const token = (await searchParams).token;
  return (
    <div className="auth-wrap">
      <h1 className="page-h1">Choose a new password</h1>
      {typeof token === "string" && token ? (
        <div className="auth-card">
          <ResetForm token={token} />
        </div>
      ) : (
        <>
          <p className="page-lede">This reset link isn’t valid. Request a new one.</p>
          <p className="auth-alt">
            <Link className="btn" href="/account/forgot">
              Request a new link
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
