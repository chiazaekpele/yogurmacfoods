import { describe, expect, it } from "vitest";
import { infoPageSchema, PAGE_KIND_INFO, PAGE_KINDS, readBlocks } from "@/lib/info-pages";

const page = (blocks: unknown[], kind = "STANDARD") => infoPageSchema.safeParse({ kind, title: "Our Team", intro: "", isPublished: true, blocks });

describe("info pages", () => {
  it("each page type starts with sections that are valid", () => {
    for (const k of PAGE_KINDS) expect(page(PAGE_KIND_INFO[k].starter(), k).success).toBe(true);
  });
  it("accepts gallery photos uploaded through the admin, and rejects other links", () => {
    expect(page([{ type: "gallery", heading: "", images: [{ url: "/media/cmv82zldl000d3qo6zoyedx1l", caption: "Outreach" }] }]).success).toBe(true);
    expect(page([{ type: "gallery", heading: "", images: [{ url: "https://evil.example/x.jpg", caption: "" }] }]).success).toBe(false);
  });
  it("needs a name for every team member, but drops rows left completely empty", () => {
    expect(page([{ type: "team", heading: "", members: [{ name: "", role: "Founder", bio: "", photoUrl: null }] }], "TEAM").success).toBe(false);
    const r = infoPageSchema.parse({ kind: "TEAM", title: "Our Team", intro: "", isPublished: true, blocks: [{ type: "team", heading: "", members: [{ name: "Clara", role: "", bio: "", photoUrl: null }, { name: "", role: "", bio: "", photoUrl: null }] }] });
    expect(r.blocks[0].type === "team" && r.blocks[0].members).toHaveLength(1);
  });
  it("skips stored sections that no longer parse", () => {
    expect(readBlocks([{ type: "text", heading: "A", body: "B", imageUrl: null }, { type: "video" }, "junk"])).toHaveLength(1);
    expect(readBlocks(null)).toEqual([]);
  });
});
