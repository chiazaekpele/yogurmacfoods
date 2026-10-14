import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import { CookieNotice } from "@/components/CookieNotice";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import "./globals.css";
import { siteUrl } from "@/lib/site";

// One typeface across the site: Fredoka (weights 400–700).
const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Yogurmac Foods — Premium Greek yogurt, granola & energy bars", template: "%s · Yogurmac Foods" },
  description:
    "Faith-driven, Lagos-made Greek yogurt, granola and energy bars, made fresh to order and delivered across Lagos.",
  openGraph: { siteName: "Yogurmac Foods", type: "website", locale: "en_NG" },
};

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={fredoka.variable}>
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
