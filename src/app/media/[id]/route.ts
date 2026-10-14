import { db } from "@/lib/db";

// Serves images uploaded in the admin. An id is never reused for different
// bytes, so browsers and the CDN may cache each one for a year.
export async function GET(_req: Request, ctx: RouteContext<"/media/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const img = await db.mediaImage.findUnique({ where: { id }, select: { mimeType: true, bytes: true } });
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
