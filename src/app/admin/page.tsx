import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { SignInForm } from "./AuthForms";

export const metadata: Metadata = { title: "Admin Login" };

const NOTICES: Record<string, string> = {
  expired: "Your session has expired. Please sign in again.",
  signedout: "You have signed out.",
  created: "Your admin account is ready. Sign in to continue.",
};

export default async function AdminLogin({ searchParams }: PageProps<"/admin">) {
  if (await getAdmin()) redirect("/admin/dashboard");
  const { reason } = await searchParams;
  const notice = typeof reason === "string" ? NOTICES[reason] : undefined;
  return (
    <div className="auth">
      <div className="auth-card card">
        <div className="brand">Yogurmac</div>
        <h1 className="h1" style={{ margin: "6px 0 18px" }}>
          Admin Login
        </h1>
        {notice && (
          <div className="form-ok" role="status" style={{ marginBottom: 16 }}>
            {notice}
          </div>
        )}
        <SignInForm signUpOpen={!!process.env.ADMIN_SIGNUP_CODE?.trim()} />
      </div>
    </div>
  );
}
