// Nigerian mobile numbers only (TRD §15): they drive WhatsApp and rider calls.
// Accepts the ways people actually type them: 0803 123 4567, 803-123-4567,
// +234 (0) 803 123 4567, 00234 803…, 234.803… Stored as +234XXXXXXXXXX.
const MOBILE = /^[789][01]\d{8}$/;

export function normaliseNigerianMobile(input: string): string | null {
  if (!/^[+\d\s().\-/]+$/.test(input.trim())) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00234")) digits = digits.slice(5);
  else if (digits.startsWith("234")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return MOBILE.test(digits) ? `+234${digits}` : null;
}
