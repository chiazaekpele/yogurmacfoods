import { createNeonAuth } from "@neondatabase/auth/next/server";

// Customer accounts (13 Oct 2026). Same Neon Auth project as the staff portal,
// with the shop's own cookie secret, so shop and staff sessions never mix.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
