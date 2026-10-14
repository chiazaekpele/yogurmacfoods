import type { Metadata } from "next";
import "./admin.css";

// Every admin page depends on the login cookie, so none is prerendered at build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Yogurmac Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
