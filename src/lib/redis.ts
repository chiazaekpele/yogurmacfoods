import { Redis } from "@upstash/redis";

// Upstash when configured; otherwise callers fall back to in-memory behaviour.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Key prefix per environment so dev/test traffic never touches production keys.
export const keyPrefix =
  process.env.VERCEL_ENV === "production" ? "prod:" : process.env.NODE_ENV === "test" ? "test:" : "dev:";
