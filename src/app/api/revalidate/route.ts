import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

// Called by the staff portal after admin edits, so changes show on the shop
// immediately rather than after the 60s / 5min time-based refresh (TRD §10.1).
const bodySchema = z.strictObject({ paths: z.array(z.string().startsWith("/").max(200)).min(1).max(50) });

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  for (const path of parsed.data.paths) revalidatePath(path);
  return NextResponse.json({ revalidated: parsed.data.paths });
}
