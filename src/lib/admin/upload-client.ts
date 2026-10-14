"use client";

// Browser side of /api/admin/media: uploads one image and returns its /media URL.
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name}: only JPG, PNG or WEBP images.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/media", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
  return json.url;
}
