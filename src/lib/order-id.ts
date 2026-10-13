import { randomInt } from "node:crypto";
import { lagosDateStamp } from "./lagos-time";

// No 0/O or 1/I/L, so IDs read cleanly over the phone.
export const ORDER_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ORDER_ID_PATTERN = /^YMF-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;
export const DONATION_REF_PATTERN = /^YMG-\d{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

function generateReference(prefix: string, now: Date): string {
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ORDER_ID_ALPHABET[randomInt(ORDER_ID_ALPHABET.length)];
  return `${prefix}-${lagosDateStamp(now)}-${suffix}`;
}

export const generateOrderId = (now = new Date()) => generateReference("YMF", now);
// Donations get their own prefix so they can never be mistaken for an order.
export const generateDonationRef = (now = new Date()) => generateReference("YMG", now);
