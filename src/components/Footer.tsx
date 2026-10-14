"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminPage, isBarePage } from "@/lib/chrome";
import { CONTACT_EMAIL } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  const pathname = usePathname();
  if (isAdminPage(pathname)) return null;
  if (isBarePage(pathname)) {
    return (
      <footer className="footer footer-bare">
        <Logo />
      </footer>
    );
  }
  return (
    <footer className="footer">
      <div className="footer-in">
        <div className="footer-brand">
          <Logo />
          <p>Premium Greek yogurt, granola and energy bars, made fresh to order in Lagos. Faith-driven, and giving back through the Ythirst Project.</p>
        </div>
        <div>
          <h2 className="footer-h">Shop</h2>
          <Link href="/products">All products</Link>
          <Link href="/cart">Cart</Link>
        </div>
        <div>
          <h2 className="footer-h">Company</h2>
          <Link href="/our-story">Our Story</Link>
          <Link href="/impact">Ythirst</Link>
          <Link href="/impact#boxes">Wellness boxes</Link>
        </div>
        <div>
          <h2 className="footer-h">Get in touch</h2>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <span className="footer-ic">Lagos, Nigeria</span>
          <span className="footer-ic">Delivery across Lagos</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Yogurmac Foods Limited. All rights reserved.</span>
        <span className="footer-legal">
          <Link href="/faq">FAQ</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/privacy-policy">Privacy policy</Link>
        </span>
      </div>
    </footer>
  );
}
