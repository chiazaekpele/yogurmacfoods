import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  expired: "Your session has expired. Please sign in again.",
  inactive: "This account is no longer active.",
  signedout: "You have signed out.",
  activated: "Your password is set. Sign in to continue.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getSessionUser();
  if (user?.isActive) redirect(homeFor(user.role));
  const { reason } = await searchParams;
  const notice = typeof reason === "string" ? NOTICES[reason] : undefined;

  return (
    <div className="auth">
      <div className="auth-card card">
        <div className="brand">Yogurmac Foods</div>
        <div className="eyebrow" style={{ marginBottom: 18 }}>
          Staff portal
        </div>
        {notice && (
          <div className="form-ok" role="status" style={{ marginBottom: 16 }}>
            {notice}
          </div>
        )}
        <LoginForm />
        <p className="hint" style={{ marginTop: 16 }}>
          Forgotten your password? Ask the business owner to send you a new invite.
        </p>
      </div>
    </div>
  );
}
