// Nigerian mobile numbers only (TRD §15): they drive WhatsApp and rider calls.
const MOBILE = /^(?:\+?234|0)([789][01]\d{8})$/;

export function normaliseNigerianMobile(input: string): string | null {
  const compact = input.replace(/[\s()-]/g, "");
  const match = MOBILE.exec(compact);
  return match ? `+234${match[1]}` : null;
}
