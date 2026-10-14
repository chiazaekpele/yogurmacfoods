"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { isAdminPage, isBarePage } from "@/lib/chrome";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/products", label: "Products" },
  { href: "/our-story", label: "Our Story" },
  { href: "/impact", label: "Ythirst" },
];

export function Nav() {
  const { count } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [me, setMe] = useState<{ signedIn: boolean; firstName?: string } | null>(null);

  // Close the phone menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  // Pages are cached, so the header asks who is signed in after it loads.
  useEffect(() => {
    if (isAdminPage(pathname)) return;
    fetch("/api/account/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ signedIn: false }));
  }, [pathname]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (isAdminPage(pathname)) return null;
  if (isBarePage(pathname)) {
    return (
      <header className="header">
        <div className="header-in">
          <Logo />
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header-in">
        <Logo />
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="btn btn-sm header-give" href="/impact#boxes">
            Wellness Boxes
          </Link>
          <Link className="icon-btn" href="/account" aria-label={me?.signedIn ? `My account (${me.firstName})` : "Sign in"} title={me?.signedIn ? "My account" : "Sign in"}>
            <Icon name="user" size={22} />
          </Link>
          <Link className="icon-btn" href="/cart" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
            <Icon name="cart" size={22} />
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? "close" : "menu"} size={24} />
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-menu" id="mobile-menu" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <Link href="/account">{me?.signedIn ? "My account" : "Sign in"}</Link>
          <Link className="btn btn-block" href="/impact#boxes">
            Wellness Boxes
          </Link>
        </nav>
      )}
    </header>
  );
}
