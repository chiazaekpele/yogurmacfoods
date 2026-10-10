import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Product photos bundled with the shop are shown from the shop's domain.
const shopOrigin = new URL(process.env.NEXT_PUBLIC_SHOP_URL ?? "http://localhost:3000").origin;

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com ${shopOrigin}`,
  "font-src 'self'",
  // Product images go straight from the browser to Cloudinary (PRD §6.3).
  "connect-src 'self' https://api.cloudinary.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // This app lives in staff/ inside the shop's repo; build it on its own.
  turbopack: { root: process.cwd() },
  // forbidden() renders the 403 page for staff who open admin URLs (PRD §4.4).
  experimental: { authInterrupts: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
