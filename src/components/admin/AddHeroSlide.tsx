"use client";

import { useState } from "react";
import { addSlide } from "@/app/admin/(panel)/hero/actions";
import { uploadImage } from "@/lib/admin/upload-client";
import { HeroFields } from "./HeroFields";
import { SubmitButton } from "./SubmitButton";

export function AddHeroSlide() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      setUrl(await uploadImage(f));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={addSlide} className="card">
      <h2 className="h2">Add an image</h2>
      <p className="hint" style={{ marginBottom: 12 }}>
        Wide photos work best (at least 1600 pixels across). JPG, PNG or WEBP, up to 5 MB.
      </p>
      {error && (
        <div className="form-err" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <label className="btn btn-ghost btn-sm" style={{ cursor: busy ? "wait" : "pointer", marginBottom: 14 }}>
        {busy ? "Uploading…" : url ? "Choose a different image" : "Choose image"}
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={(e) => choose(e.target.files)} />
      </label>
      <input type="hidden" name="imageUrl" value={url ?? ""} />
      <HeroFields key={url ?? "none"} idPrefix="new" imageUrl={url} initial={{ alt: "", href: "/products", position: "", fit: "cover", background: "" }} />
      <div style={{ marginTop: 14 }}>
        <SubmitButton pendingText="Adding…" disabled={!url}>
          Add to homepage
        </SubmitButton>
      </div>
    </form>
  );
}
