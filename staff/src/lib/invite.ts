import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

// 32 random bytes; only the SHA-256 hash is stored (PRD §10, TRD §9.3).
export function newInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token), expiry: new Date(Date.now() + INVITE_TTL_MS) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  return `${base}/invite/${token}`;
}

// The invited account for a raw token, if the link is still valid.
export async function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db.user.findFirst({ where: { inviteTokenHash: hashInviteToken(token), inviteExpiry: { gt: new Date() } } });
}
