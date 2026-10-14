import { randomInt } from "node:crypto";
import { lagosDateStamp } from "./lagos-time";

// No 0/O or 1/I/L, so IDs read cleanly over the phone.
const ORDER_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ORDER_ID_PATTERN = /^YMF-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

export function generateOrderId(now = new Date()): string {
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ORDER_ID_ALPHABET[randomInt(ORDER_ID_ALPHABET.length)];
  return `YMF-${lagosDateStamp(now)}-${suffix}`;
}
