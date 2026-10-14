import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { SignUpForm } from "../AuthForms";

export const metadata: Metadata = { title: "Create an admin account" };

export default async function AdminSignUp() {
  if (await getAdmin()) redirect("/admin/dashboard");
  const open = !!process.env.ADMIN_SIGNUP_CODE?.trim();
  return (
    <div className="auth">
      <div className="auth-card card">
        <div className="brand">Yogurmac</div>
        <h1 className="h1" style={{ margin: "6px 0 6px" }}>
          Create an admin account
        </h1>
        {open ? (
          <>
            <p className="muted" style={{ marginBottom: 18 }}>
              You need the sign-up code from the business owner.
            </p>
            <SignUpForm />
          </>
        ) : (
          <p className="muted">
            Admin sign-up is closed. <Link href="/admin" className="link">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
