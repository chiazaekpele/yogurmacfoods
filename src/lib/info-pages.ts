import { z } from "zod";

// The owner's own pages, built from sections in the admin and shown at
// /company/<slug>. Browser-safe: used by the editor and the server.
const image = z
  .string()
  .regex(/^\/(media\/[a-z0-9]{20,40}|images\/[a-z0-9/-]+\.(jpe?g|png|webp))$/, "Images must be uploaded through the form.")
  .nullable();
const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);

export const textBlockSchema = z.object({
  type: z.literal("text"),
  heading: text(120),
  body: text(5000),
  imageUrl: image,
});
export const teamMemberSchema = z.object({
  name: text(80).min(1, "Every team member needs a name."),
  role: text(80),
  bio: text(600),
  photoUrl: image,
});
export const teamBlockSchema = z.object({
  type: z.literal("team"),
  heading: text(120),
  // Rows left completely empty are dropped rather than refused.
  members: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((m) => !m || typeof m !== "object" || ["name", "role", "bio", "photoUrl"].some((k) => String((m as Record<string, unknown>)[k] ?? "").trim())) : v),
    z.array(teamMemberSchema).max(40),
  ),
});
export const galleryImageSchema = z.object({
  url: image.unwrap(),
  caption: text(160),
});
export const galleryBlockSchema = z.object({
  type: z.literal("gallery"),
  heading: text(120),
  images: z.array(galleryImageSchema).max(60),
});
export const blockSchema = z.discriminatedUnion("type", [textBlockSchema, teamBlockSchema, galleryBlockSchema]);
export const blocksSchema = z.array(blockSchema).max(30);

export type TextBlock = z.infer<typeof textBlockSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type Block = z.infer<typeof blockSchema>;

// Page types: what a page is mainly for. The type picks the sections a new
// page starts with and is shown in the admin; any page can add any section.
export const PAGE_KINDS = ["STANDARD", "TEAM", "GALLERY"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

export const PAGE_KIND_INFO: Record<PageKind, { label: string; description: string; examples: string; starter: () => Block[] }> = {
  STANDARD: {
    label: "Standard page",
    description: "Headings and paragraphs, each with an optional photo beside it.",
    examples: "Our mission, our history, how we make our yogurt",
    starter: () => [{ type: "text", heading: "", body: "", imageUrl: null }],
  },
  TEAM: {
    label: "Team page",
    description: "The people behind Yogurmac: a photo, name, role and short bio for each person.",
    examples: "Our team, our founders, our partners",
    starter: () => [{ type: "team", heading: "", members: [{ name: "", role: "", bio: "", photoUrl: null }] }],
  },
  GALLERY: {
    label: "Gallery page",
    description: "A grid of photos, each with an optional caption.",
    examples: "Ythirst outreach photos, our kitchen, events",
    starter: () => [{ type: "gallery", heading: "", images: [] }],
  },
};

export const infoPageSchema = z.object({
  kind: z.enum(PAGE_KINDS),
  title: text(80).min(2, "Give the page a title."),
  intro: text(600),
  isPublished: z.boolean(),
  blocks: blocksSchema,
});
export type InfoPageInput = z.infer<typeof infoPageSchema>;

// Stored blocks that no longer parse are skipped rather than breaking the page.
export function readBlocks(json: unknown): Block[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((b) => {
    const r = blockSchema.safeParse(b);
    return r.success ? [r.data] : [];
  });
}
