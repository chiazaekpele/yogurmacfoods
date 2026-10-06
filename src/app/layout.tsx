import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { CookieNotice } from "@/components/CookieNotice";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import "./globals.css";

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-condensed",
  display: "swap",
});
const body = Barlow({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Yogurmac Foods — Premium Greek yogurt, granola & energy bars", template: "%s · Yogurmac Foods" },
  description:
    "Faith-driven, Lagos-made Greek yogurt, granola and energy bars, made fresh to order and delivered across all 20 Lagos LGAs.",
  openGraph: { siteName: "Yogurmac Foods", type: "website", locale: "en_NG" },
};

export const viewport: Viewport = { themeColor: "#F2EDE4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${condensed.variable} ${body.variable}`}>
      <body id="top">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <CookieNotice />
      </body>
    </html>
  );
}
