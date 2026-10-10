import { createHash } from "node:crypto";

// Signed uploads (TRD §14, §21 item 5): an admin-only endpoint signs the
// parameters and the browser sends the file straight to Cloudinary.
export const CLOUDINARY_FOLDER = "yogurmac/products";
export const ALLOWED_FORMATS = "jpg,png,webp";

export function cloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export function signUpload(apiSecret: string, params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export function imageUrlPrefix(): string | null {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return cloud ? `https://res.cloudinary.com/${cloud}/` : null;
}
