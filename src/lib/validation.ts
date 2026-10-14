import { z } from "zod";
import { LAGOS_LGAS } from "./lgas";
import { normaliseNigerianMobile } from "./phone";

const name = z.string().trim().min(2, "Enter your full name").max(100);
const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");

export const phoneSchema = z
  .string()
  .transform((v, ctx) => {
    const n = normaliseNigerianMobile(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter an 11-digit mobile number like 09133999279, or +2349133999279" });
      return z.NEVER;
    }
    return n;
  });

export const MAX_DAYS = 365;

export const cartItemSchema = z.strictObject({
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(99),
  // Wellness boxes only: one box delivered each day for this many days.
  days: z.number().int().min(1).max(MAX_DAYS).optional().default(1),
});

export const checkoutSchema = z.strictObject({
  customerName: name,
  customerEmail: email,
  customerPhone: phoneSchema,
  lga: z.enum(LAGOS_LGAS, { message: "Choose your LGA" }),
  exactAddress: z.string().trim().min(5, "Enter your full delivery address").max(300),
  landmark: z.string().trim().max(150).optional().transform((v) => v || undefined),
  items: z.array(cartItemSchema).min(1, "Your cart is empty").max(50),
  // Total the customer was shown, in kobo. Used only to detect price drift.
  expectedTotalKobo: z.number().int().nonnegative(),
  // Required tick box at checkout (Yogurmac's terms, 14 Oct 2026).
  acceptTerms: z.literal(true, { message: "Please agree to the Terms & Conditions and Privacy Policy" }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
