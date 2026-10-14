import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Static-compatible CSP for the shop (TRD §11.3): no nonces, so pages can stay
// statically cached. Allows Paystack's inline script and checkout frame.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.paystack.co${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://paystack.com",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self'",
  "connect-src 'self' https://api.paystack.co",
  "frame-src https://checkout.paystack.com https://js.paystack.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // The Ythirst page and the old giving page became Business Impact (13 Oct 2026).
  async redirects() {
    return [
      { source: "/ythirst", destination: "/impact", permanent: true },
      { source: "/partner", destination: "/impact#boxes", permanent: true },
      { source: "/partner/thank-you", destination: "/impact", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.paystack.com\")" },
        ],
      },
    ];
  },
};

export default nextConfig;
