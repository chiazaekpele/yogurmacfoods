import { Ratelimit } from "@upstash/ratelimit";
import { keyPrefix, redis } from "./redis";

type Limit = { requests: number; windowSeconds: number };

const upstashLimiters = new Map<string, Ratelimit>();
const memory = new Map<string, number[]>();

// Sliding-window limit per IP (TRD §11.1). In-memory fallback is per process,
// which is fine locally but not on Vercel, so Upstash is required in production.
export async function rateLimit(name: string, ip: string, limit: Limit): Promise<boolean> {
  if (redis) {
    let limiter = upstashLimiters.get(name);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        prefix: `${keyPrefix}ratelimit:${name}`,
        limiter: Ratelimit.slidingWindow(limit.requests, `${limit.windowSeconds} s`),
      });
      upstashLimiters.set(name, limiter);
    }
    return (await limiter.limit(ip)).success;
  }

  const key = `${name}:${ip}`;
  const now = Date.now();
  const recent = (memory.get(key) ?? []).filter((t) => now - t < limit.windowSeconds * 1000);
  if (recent.length >= limit.requests) {
    memory.set(key, recent);
    return false;
  }
  recent.push(now);
  memory.set(key, recent);
  return true;
}
