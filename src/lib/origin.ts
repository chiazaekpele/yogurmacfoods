// Route Handlers get no automatic CSRF protection, so every mutating browser
// route checks Origin (TRD §9.7). Webhooks and /api/revalidate are exempt.
export function allowedOrigins(): string[] {
  const list = [process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.ALLOWED_ORIGINS ?? "").split(",")];
  if (process.env.NODE_ENV !== "production") list.push("http://localhost:3000", "http://127.0.0.1:3000");
  return list.map((o) => o?.trim().replace(/\/$/, "")).filter((o): o is string => !!o);
}

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !!origin && allowedOrigins().includes(origin);
}
