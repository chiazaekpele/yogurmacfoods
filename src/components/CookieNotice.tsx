"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdminPage } from "@/lib/chrome";

const COOKIE = "ymf_cookie_notice=1";

// NDPR cookie notice (PRD §11). The shop sets no tracking cookies in v1, so this
// is a notice rather than a choice; acknowledging it is remembered for a year.
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!document.cookie.includes(COOKIE)), []);
  const pathname = usePathname();
  if (!show || isAdminPage(pathname)) return null;
  return (
    <div className="cookie" role="region" aria-label="Cookie notice">
      <span>
        We only use cookies needed for the shop to work, such as remembering your cart. No tracking.{" "}
        <Link href="/privacy-policy#cookies">Learn more</Link>
      </span>
      <button
        className="btn"
        onClick={() => {
          document.cookie = `${COOKIE}; max-age=31536000; path=/; samesite=lax`;
          setShow(false);
        }}
      >
        OK
      </button>
    </div>
  );
}
