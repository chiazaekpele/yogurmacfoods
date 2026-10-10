"use client";

import { useActionState, useState } from "react";
import { saveProductAction, type SaveState } from "@/app/admin/products/actions";
import { CATEGORIES, CATEGORY_LABELS, imageSrc, slugify } from "@/lib/product-meta";

type Variant = { key: string; id?: string; flavour: string; size: string; price: string; isAvailable: boolean };
export type ProductFormValue = {
  name: string;
  slug: string;
  category: (typeof CATEGORIES)[number];
  description: string;
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  variants: Omit<Variant, "key">[];
};

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
let nextKey = 0;
const key = () => `v${nextKey++}`;

export function ProductForm({ productId, initial, uploadsEnabled }: { productId: string | null; initial: ProductFormValue; uploadsEnabled: boolean }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProductAction.bind(null, productId), null);
  const [v, setV] = useState({ ...initial, variants: initial.variants.map((x) => ({ ...x, key: key() })) });
  const [slugTouched, setSlugTouched] = useState(!!productId);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));
  const setVariant = (i: number, patch: Partial<Variant>) => set("variants", v.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    const list = Array.from(files).slice(0, 5 - v.images.length);
    for (const f of list) {
      if (!TYPES.includes(f.type)) return setUploadError(`${f.name}: only JPG, PNG or WEBP images.`);
      if (f.size > MAX_BYTES) return setUploadError(`${f.name} is larger than 5 MB.`);
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of list) {
        const sig = await fetch("/api/cloudinary/sign", { method: "POST" }).then((r) => r.json());
        if (sig.error) throw new Error(sig.error);
        const body = new FormData();
        body.append("file", f);
        for (const k of ["api_key", "timestamp", "signature", "folder", "allowed_formats"] as const) {
          body.append(k, String(k === "api_key" ? sig.apiKey : sig[k]));
        }
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body });
        const json = await res.json();
        if (!res.ok || !json.secure_url) throw new Error(json.error?.message ?? "Upload failed.");
        urls.push(json.secure_url);
      }
      set("images", [...v.images, ...urls]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function moveImage(from: number, to: number) {
    if (from === to) return;
    const next = [...v.images];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    set("images", next);
  }

  const payload = JSON.stringify({
    name: v.name,
    slug: v.slug,
    category: v.category,
    description: v.description,
    images: v.images,
    isFeatured: v.isFeatured,
    isActive: v.isActive,
    variants: v.variants.map(({ key: _k, ...x }) => x),
  });

  return (
    <form action={action} className="stack">
      <input type="hidden" name="payload" value={payload} />
      {state?.error && (
        <div className="form-err" role="alert">
          {state.error}
        </div>
      )}

      <div className="card">
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="name">Product name</label>
            <input
              id="name"
              type="text"
              required
              maxLength={120}
              value={v.name}
              onChange={(e) => setV((s) => ({ ...s, name: e.target.value, slug: slugTouched ? s.slug : slugify(e.target.value) }))}
            />
          </div>
          <div className="field" style={{ marginTop: 0 }}>
            <label htmlFor="slug">Web address</label>
            <input
              id="slug"
              type="text"
              required
              maxLength={80}
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
            />
            <span className="hint">yogurmacfoods.com/products/{v.slug || "…"}</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" value={v.category} onChange={(e) => set("category", e.target.value as ProductFormValue["category"])}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" required maxLength={2000} value={v.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 14, gap: 24 }}>
          <label className="check">
            <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Live in the shop
          </label>
          <label className="check">
            <input type="checkbox" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured on the homepage
          </label>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Photos</h2>
        <p className="hint" style={{ marginBottom: 10 }}>
          Up to 5 images (JPG, PNG or WEBP, 5 MB each). Drag to reorder; the first photo is the main one.
        </p>
        <div className="thumbs">
          {v.images.map((url, i) => (
            <div
              key={url}
              className="thumb"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragIndex !== null && moveImage(dragIndex, i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc(url)} alt={`Photo ${i + 1}`} />
              <div className="row-between" style={{ marginTop: 4 }}>
                <span>{i === 0 ? "Main" : `#${i + 1}`}</span>
                <span className="row" style={{ gap: 4 }}>
                  {i > 0 && (
                    <button type="button" className="link" aria-label={`Move photo ${i + 1} earlier`} onClick={() => moveImage(i, i - 1)}>
                      ←
                    </button>
                  )}
                  <button type="button" className="link" aria-label={`Remove photo ${i + 1}`} onClick={() => set("images", v.images.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
        {uploadsEnabled ? (
          v.images.length < 5 && (
            <div style={{ marginTop: 12 }}>
              <label className="btn btn-ghost btn-sm" style={{ cursor: uploading ? "wait" : "pointer" }}>
                {uploading ? "Uploading…" : "Add photos"}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={(e) => upload(e.target.files)} />
              </label>
            </div>
          )
        ) : (
          <p className="hint" style={{ marginTop: 10 }}>
            Photo uploads aren’t set up yet (Cloudinary). The shop shows a branded placeholder until photos are added.
          </p>
        )}
        {uploadError && <p className="err">{uploadError}</p>}
      </div>

      <div className="card">
        <h2 className="h2">Flavours, sizes and prices</h2>
        <p className="hint">Each row is one thing a customer can buy. Price changes don’t affect past orders.</p>
        {v.variants.map((x, i) => (
          <div className="variant-row" key={x.key}>
            <div className="field">
              <label htmlFor={`flavour-${x.key}`}>Flavour</label>
              <input id={`flavour-${x.key}`} type="text" required maxLength={60} value={x.flavour} onChange={(e) => setVariant(i, { flavour: e.target.value })} />
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor={`size-${x.key}`}>Size</label>
              <input id={`size-${x.key}`} type="text" required maxLength={40} value={x.size} onChange={(e) => setVariant(i, { size: e.target.value })} />
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor={`price-${x.key}`}>Price (₦)</label>
              <input id={`price-${x.key}`} type="number" required min="1" step="0.01" value={x.price} onChange={(e) => setVariant(i, { price: e.target.value })} />
            </div>
            <label className="check" style={{ paddingBottom: 10 }}>
              <input type="checkbox" checked={x.isAvailable} onChange={(e) => setVariant(i, { isAvailable: e.target.checked })} /> Available
            </label>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              style={{ marginBottom: 6 }}
              disabled={v.variants.length === 1}
              onClick={() => set("variants", v.variants.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => set("variants", [...v.variants, { key: key(), flavour: "", size: "", price: "", isAvailable: true }])}
        >
          Add flavour and size
        </button>
      </div>

      <div className="row">
        <button className="btn" disabled={pending || uploading}>
          {pending ? "Saving…" : "Save product"}
        </button>
        <a className="btn btn-ghost" href="/admin/products">
          Cancel
        </a>
      </div>
    </form>
  );
}
