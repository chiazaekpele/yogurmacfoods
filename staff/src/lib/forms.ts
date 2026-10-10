import { redirect } from "next/navigation";
import { z } from "zod";

// Server actions redirect back with a one-line message (?ok= or ?error=) that
// <Flash> shows, so plain HTML forms work without client JavaScript.
export function backWith(path: string, kind: "ok" | "error", message: string): never {
  const url = new URL(path, "http://x");
  url.searchParams.delete("ok");
  url.searchParams.delete("error");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}${url.search}`);
}

// Stored as plain text with tags stripped; React escapes on render (TRD §11.2).
export const plainText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/<[^>]*>/g, "").replace(/\r\n/g, "\n").trim())
    .pipe(z.string().max(max, `Keep this under ${max} characters.`));

export const requiredText = (max: number, label: string) => plainText(max).pipe(z.string().min(1, `${label} is required.`));

export const optionalText = (max: number) =>
  plainText(max)
    .optional()
    .transform((s) => (s ? s : null));

export const nairaAmount = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount in naira, e.g. 2500 or 2500.50.");

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Please check the form.";
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
