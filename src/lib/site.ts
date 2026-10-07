// The public contact inbox, shown in the footer, privacy policy and order pages,
// and used as the reply-to address on customer emails. Set per deployment so a
// real inbox can be swapped in without a code change.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@yogurmacfoods.com";
