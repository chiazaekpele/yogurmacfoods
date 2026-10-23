import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { getAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/origin";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.4 MB

// The file's first bytes must match its claimed type, so nothing else is served as an image.
function looksLike(type: string, b: Uint8Array): boolean {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  return String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";
}

// Admin photo uploads (products, boxes, homepage images). Images are stored in
// the database and served from /media/<id>, so no extra storage service is needed.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ error: "Only JPG, PNG or WEBP images." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be 4 MB or smaller." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLike(file.type, bytes)) return NextResponse.json({ error: "That file isn’t a valid image." }, { status: 400 });

  const image = await db.$transaction(async (tx) => {
    const img = await tx.mediaImage.create({
      data: { mimeType: file.type, bytes, size: bytes.byteLength, fileName: file.name.slice(0, 200) || null },
      select: { id: true },
    });
    await audit(tx, { actorId: admin.id, action: "IMAGE_UPLOADED", entityType: "MediaImage", entityId: img.id });
    return img;
  });
  return NextResponse.json({ url: `/media/${image.id}` }, { status: 201 });
}
