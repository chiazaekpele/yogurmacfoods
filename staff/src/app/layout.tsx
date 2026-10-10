import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-condensed",
  display: "swap",
});
const body = Barlow({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body", display: "swap" });

// Every page depends on who is signed in; nothing is prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Yogurmac Staff", template: "%s · Yogurmac Staff" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F2EDE4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${condensed.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
