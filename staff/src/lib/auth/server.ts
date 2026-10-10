import { createNeonAuth } from "@neondatabase/auth/next/server";

// Neon Auth holds passwords and sessions (TRD §9, decision of 7 Oct 2026).
// Session cookies are httpOnly and signed with NEON_AUTH_COOKIE_SECRET.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
