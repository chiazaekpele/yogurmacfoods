import { type ContactLink, contactLinks } from "./contact";
import { db } from "./db";
import { getSiteSettings } from "./settings";
import { CONTACT_EMAIL } from "./site";

// What every shop page shows around its content: approved reviews above the
// footer, the Contact us links and the owner's own pages in the footer.
export type PublicReview = { id: string; rating: number; body: string; displayName: string };
export type ChromeData = { contact: ContactLink[]; pages: { title: string; slug: string }[]; reviews: PublicReview[] };

const EMPTY: ChromeData = { contact: [{ label: "Email", text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` }], pages: [], reviews: [] };

// Read on every page, so kept for a minute per server instance; admin saves
// clear it (on that instance) and refresh the pages.
const TTL_MS = 60_000;
let cached: { at: number; value: ChromeData } | null = null;

export async function getChromeData(): Promise<ChromeData> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const [settings, pages, reviews] = await Promise.all([
      getSiteSettings(),
      db.infoPage.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { title: true, slug: true } }),
      db.customerReview.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 9,
        select: { id: true, rating: true, body: true, displayName: true },
      }),
    ]);
    const contact = contactLinks(settings);
    const value: ChromeData = { contact: contact.length ? contact : EMPTY.contact, pages, reviews };
    cached = { at: Date.now(), value };
    return value;
  } catch (err) {
    // A database blip must not take the whole page down.
    console.error("Footer data unavailable:", err);
    return cached?.value ?? EMPTY;
  }
}

export function clearChromeCache() {
  cached = null;
}
