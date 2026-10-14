import { auth } from "@/lib/auth/server";

// Neon Auth's endpoints for the browser (session refresh). Sign-in, sign-up and
// password resets go through the account pages' server actions.
export const { GET, POST } = auth.handler();
