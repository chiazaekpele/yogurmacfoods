import { NextResponse, type NextRequest } from "next/server";
import {
  NEON_AUTH_SESSION_COOKIE_NAME,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
  processAuthMiddleware,
  validateSessionData,
} from "@neondatabase/auth/server";

// Refreshes the login before pages that read it. Neon Auth renews a session by
// setting cookies, which a page render may not do (Next.js throws, and the
// visitor sees the error page). Proxy may set them, and Next.js passes them on
// to the page in the same request. Pages stay public: nothing is redirected.
export async function proxy(request: NextRequest) {
  if (!(request.headers.get("cookie") ?? "").includes(NEON_AUTH_SESSION_COOKIE_NAME)) return NextResponse.next();

  // A valid cached session needs no refresh.
  const cached = request.cookies.get(NEON_AUTH_SESSION_DATA_COOKIE_NAME)?.value;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET!;
  if (cached && (await validateSessionData(cached, secret)).valid) return NextResponse.next();

  try {
    const result = await processAuthMiddleware({
      request,
      pathname: request.nextUrl.pathname,
      skipRoutes: [request.nextUrl.pathname], // refresh only, never require a login here
      loginUrl: "/__neon-auth-login-unused",
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookieSecret: secret,
    });
    const response = NextResponse.next();
    for (const cookie of result.cookies ?? []) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch (err) {
    console.error("Session refresh failed:", err);
    return NextResponse.next();
  }
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/checkout/:path*"] };
