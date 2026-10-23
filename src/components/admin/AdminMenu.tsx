"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export type MenuGroup = { label: string; links: { href: string; label: string; badge?: number }[] };

// Top bar with a menu button; the admin sections open in a side panel, so
// every page gets the full width.
export function AdminMenu({ name, groups }: { name: string; groups: MenuGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const links = groups.flatMap((g) => g.links);
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = links.find((l) => isCurrent(l.href));
  const waiting = links.reduce((n, l) => n + (l.badge ?? 0), 0);

  // Close after navigating.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes; focus moves into the panel and back to the button.
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const btn = button.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      btn?.focus();
    };
  }, [open]);

  return (
    <>
      <header className="topbar">
        <button
          ref={button}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="admin-menu"
          aria-label={open ? "Close menu" : `Open menu${waiting ? ` (${waiting} waiting)` : ""}`}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? "close" : "menu"} size={24} />
          {waiting > 0 && !open && <span className="menu-dot" aria-hidden />}
        </button>
        <Link href="/admin/dashboard" className="topbar-brand">
          Yogurmac <span>Admin</span>
        </Link>
        {current && <span className="topbar-here">{current.label}</span>}
        <a className="topbar-shop" href="/" target="_blank" rel="noopener noreferrer">
          View shop
        </a>
      </header>

      {open && <div className="menu-backdrop" onClick={() => setOpen(false)} aria-hidden />}
      <nav id="admin-menu" ref={panel} className={`menu-panel${open ? " open" : ""}`} aria-label="Admin sections" hidden={!open}>
        {groups.map((g) => (
          <div className="menu-group" key={g.label}>
            <div className="menu-group-h">{g.label}</div>
            {g.links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
                {l.label}
                {l.badge ? <span className="badge">{l.badge}</span> : null}
              </Link>
            ))}
          </div>
        ))}
        <div className="menu-foot">
          <span>{name}</span>
          <form action="/admin/sign-out" method="post">
            <button className="link small">Sign out</button>
          </form>
        </div>
      </nav>
    </>
  );
}
