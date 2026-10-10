import { NextResponse } from "next/server";
import { ALLOWED_FORMATS, CLOUDINARY_FOLDER, cloudinaryConfig, signUpload } from "@/lib/cloudinary";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Route Handlers get no automatic CSRF check (TRD §9.7).
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await getSessionUser();
  if (!user?.isActive || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = cloudinaryConfig();
  if (!config) return NextResponse.json({ error: "Image uploads are not set up yet." }, { status: 503 });

  const params = { allowed_formats: ALLOWED_FORMATS, folder: CLOUDINARY_FOLDER, timestamp: Math.floor(Date.now() / 1000) };
  return NextResponse.json({
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    ...params,
    signature: signUpload(config.apiSecret, params),
  });
}
