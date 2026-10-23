import type { Metadata } from "next";
import { Flash } from "@/components/admin/Flash";
import { PageHead } from "@/components/admin/PageHead";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/admin/session";
import { getSiteSettings } from "@/lib/settings";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Settings" };

const SOCIAL: [key: "instagram" | "facebook" | "tiktok" | "x" | "youtube" | "linkedin", label: string][] = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["x", "X (Twitter)"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
];

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const s = await getSiteSettings();
  const v = (x: string | null) => x ?? "";

  return (
    <form action={saveSettings} className="stack">
      <PageHead title="Settings" lede="VAT, pickup and how customers can reach you. Changes show on the shop straight away." />
      <Flash searchParams={searchParams} />

      <div className="card">
        <h2 className="h2">VAT</h2>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="vatRate">VAT rate (%)</label>
          <input id="vatRate" name="vatRate" type="text" inputMode="decimal" defaultValue={String(s.vatRate)} required />
          <span className="hint">Added on top of products and delivery at checkout, and shown on every order and receipt. Use 0 to stop charging VAT.</span>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Pickup</h2>
        <label className="check">
          <input type="checkbox" name="pickupEnabled" defaultChecked={s.pickupEnabled} /> Let customers pick up their orders (no delivery fee)
        </label>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="pickupAddress">Pickup address</label>
          <input id="pickupAddress" name="pickupAddress" type="text" maxLength={300} defaultValue={v(s.pickupAddress)} placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos" />
        </div>
        <div className="field">
          <label htmlFor="pickupNote">Pickup hours or directions (optional)</label>
          <input id="pickupNote" name="pickupNote" type="text" maxLength={300} defaultValue={v(s.pickupNote)} placeholder="e.g. Monday to Saturday, 9am to 5pm. Ask for Clara at the gate." />
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Contact us</h2>
        <p className="hint" style={{ marginBottom: 12 }}>
          These form the Contact us section at the bottom of every page. Leave any you don’t use empty. For social media, type the handle (e.g. @yogurmacfoods) or paste the full link.
        </p>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="contactEmail">Email</label>
            <input id="contactEmail" name="contactEmail" type="email" defaultValue={v(s.contactEmail)} />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="text" inputMode="tel" defaultValue={v(s.phone)} />
          </div>
          <div className="field">
            <label htmlFor="whatsapp">WhatsApp number</label>
            <input id="whatsapp" name="whatsapp" type="text" inputMode="tel" defaultValue={v(s.whatsapp)} />
          </div>
          {SOCIAL.map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{label}</label>
              <input id={key} name={key} type="text" defaultValue={v(s[key])} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </form>
  );
}
