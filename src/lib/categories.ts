// Browser-safe catalogue types (no database imports).

// Categories are managed in the admin. Box categories sell tiers with
// contents, one box or one a day for N days.
export type CategoryInfo = { name: string; slug: string; isBox: boolean; sortOrder: number };

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  category: CategoryInfo;
  image: string | null;
  fromPrice: string | null;
  sizeCount: number;
  flavourCount: number;
};

// Product grid columns for n cards on desktop, chosen so rows come out full;
// any leftover cards stretch across the last row (see .card-grid in globals.css).
export function gridClass(n: number): string {
  const cols = n <= 4 ? Math.max(n, 1) : n % 4 === 0 ? 4 : 3;
  return `card-grid cols-${cols}`;
}
