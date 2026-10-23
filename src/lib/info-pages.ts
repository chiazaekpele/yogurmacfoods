import { z } from "zod";

// The owner's own pages (e.g. Our Team), built from sections in the admin and
// shown at /company/<slug>. Browser-safe: used by the editor and the server.
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
  members: z.array(teamMemberSchema).max(40),
});
export const blockSchema = z.discriminatedUnion("type", [textBlockSchema, teamBlockSchema]);
export const blocksSchema = z.array(blockSchema).max(30);

export type TextBlock = z.infer<typeof textBlockSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type Block = z.infer<typeof blockSchema>;

export const infoPageSchema = z.object({
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
