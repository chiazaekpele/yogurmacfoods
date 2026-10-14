import { siteUrl } from "./site";

// Route Handlers get no automatic CSRF protection, so every mutating browser
// route checks Origin (TRD §9.7). Webhooks and /api/revalidate are exempt.
export function allowedOrigins(): string[] {
  const vercel = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].map((h) => h && `https://${h}`);
  const list = [siteUrl(), ...vercel, ...(process.env.ALLOWED_ORIGINS ?? "").split(",")];
  if (process.env.NODE_ENV !== "production") list.push("http://localhost:3000", "http://127.0.0.1:3000");
  return list.map((o) => o?.trim().replace(/\/$/, "")).filter((o): o is string => !!o);
}

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !!origin && allowedOrigins().includes(origin);
}
