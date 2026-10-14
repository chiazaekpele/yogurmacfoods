import { createNeonAuth } from "@neondatabase/auth/next/server";

// Customer and admin logins (Neon Auth). Admins are told apart by an active
// User row with role ADMIN (lib/admin/session.ts).
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
