import type { Metadata } from "next";
import Link from "next/link";
import { findInvite } from "@/lib/invite";
import { InviteForm } from "./InviteForm";

export const metadata: Metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const user = await findInvite(token);

  return (
    <div className="auth">
      <div className="auth-card card">
        <div className="brand">Yogurmac Foods</div>
        <div className="eyebrow" style={{ marginBottom: 18 }}>
          Staff portal
        </div>
        {user ? (
          <>
            <h1 className="h1">Welcome, {user.name.split(" ")[0]}</h1>
            <p className="muted" style={{ marginBottom: 16 }}>
              Choose a password for <strong>{user.email}</strong>.
            </p>
            <InviteForm token={token} />
          </>
        ) : (
          <>
            <h1 className="h1">This link has expired</h1>
            <p className="muted" style={{ marginBottom: 16 }}>
              Invite links work once and expire after 24 hours. Ask the business owner to send you a new one.
            </p>
            <Link className="btn btn-ghost" href="/login">
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
