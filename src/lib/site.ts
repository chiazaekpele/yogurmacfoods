// The public contact inbox, shown in the footer, privacy policy and order pages,
// and used as the reply-to address on customer emails. Set per deployment so a
// real inbox can be swapped in without a code change.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@yogurmacfoods.com";

// The shop's own address, for links in emails and redirects back from Paystack.
// On Vercel previews (no NEXT_PUBLIC_SITE_URL) it is the deployment's own URL.
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
