// Neon Auth calls normally return { data, error }, but a network failure throws.
// This turns a throw into an error result, so login forms show a message
// instead of the error page.
export const UNREACHABLE = "We couldn’t reach our sign-in service. Please try again in a minute.";

type AuthResult<T> = { data: T | null; error: { message?: string; unreachable?: boolean } | null };

export async function authCall<T>(call: () => Promise<{ data: T | null; error: unknown }>): Promise<AuthResult<T>> {
  try {
    const r = await call();
    return { data: r.data, error: r.error ? (r.error as { message?: string }) : null };
  } catch (err) {
    console.error("Neon Auth call failed:", err);
    return { data: null, error: { message: UNREACHABLE, unreachable: true } };
  }
}
