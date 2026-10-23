"use client";

// Browser side of /api/admin/media: uploads one image and returns its /media URL.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Vercel refuses request bodies over 4.4 MB before the upload route runs.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function uploadImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name}: only JPG, PNG or WEBP images.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 4 MB. Please use a smaller photo.`);
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/admin/media", { method: "POST", body });
  } catch {
    throw new Error("Upload failed: check your internet connection and try again.");
  }
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.status === 413) throw new Error(`${file.name} is too large. Please use a photo under 4 MB.`);
  if (res.status === 401) throw new Error("Your admin session has ended. Sign in again in a new tab, then retry.");
  if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed. Please try again.");
  return json.url;
}
