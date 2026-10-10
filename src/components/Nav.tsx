"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/hooks/useCart";

const LINKS = [
  { href: "/products", label: "Products" },
  { href: "/our-story", label: "Our Story" },
  { href: "/ythirst", label: "Ythirst Project" },
];

export function Nav() {
  const { count } = useCart();
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-top">
        <Link className="nav-brand" href="/">
          Yogurmac Foods
        </Link>
        <div className="nav-actions">
          <Link className="nav-btn partner-btn" href="/partner">
            Partner with us
          </Link>
          <Link className="nav-btn" href="/cart" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
            Cart ({count})
          </Link>
        </div>
      </div>
      <div className="nav-links">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
