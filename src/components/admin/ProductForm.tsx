"use client";

import { useActionState, useState } from "react";
import { saveProductAction, type SaveState } from "@/app/admin/(panel)/products/actions";
import { uploadImage } from "@/lib/admin/upload-client";
import { CATEGORIES, CATEGORY_LABELS, slugify } from "@/lib/admin/product-meta";

type Variant = { key: string; id?: string; flavour: string; size: string; price: string; isAvailable: boolean; imageUrl: string | null };
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

let nextKey = 0;
const key = () => `v${nextKey++}`;

export function ProductForm({ productId, initial }: { productId: string | null; initial: ProductFormValue }) {
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
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of list) urls.push(await uploadImage(f));
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
              <img src={url} alt={`Photo ${i + 1}`} />
              <div className="row-between" style={{ marginTop: 4 }}>
                <span>{i === 0 ? "Main" : `#${i + 1}`}</span>
                <span className="row" style={{ gap: 4 }}>
                  {i > 0 && (
                    <button type="button" className="link" aria-label={`Move photo ${i + 1} earlier`} onClick={() => moveImage(i, i - 1)}>
                      ←
                    </button>
                  )}
                  <button type="button" className="link" aria-label={`Remove photo ${i + 1}`} onClick={() =>
                      setV((s) => ({
                        ...s,
                        images: s.images.filter((_, j) => j !== i),
                        variants: s.variants.map((row) => (row.imageUrl === url ? { ...row, imageUrl: null } : row)),
                      }))
                    }>
                    ✕
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
        {v.images.length < 5 && (
          <div style={{ marginTop: 12 }}>
            <label className="btn btn-ghost btn-sm" style={{ cursor: uploading ? "wait" : "pointer" }}>
              {uploading ? "Uploading…" : "Add photos"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={(e) => upload(e.target.files)} />
            </label>
          </div>
        )}
        {uploadError && <p className="err">{uploadError}</p>}
      </div>

      <div className="card">
        <h2 className="h2">{v.category === "WELLNESS_BOX" ? "Tiers and prices" : "Flavours, sizes and prices"}</h2>
        <p className="hint">Each row is one thing a customer can buy. Price changes don’t affect past orders.</p>
        {v.variants.map((x, i) => (
          <div className="variant-row" key={x.key}>
            <div className="field">
              <label htmlFor={`flavour-${x.key}`}>{v.category === "WELLNESS_BOX" ? "Tier" : "Flavour"}</label>
              <input id={`flavour-${x.key}`} type="text" required maxLength={60} value={x.flavour} onChange={(e) => setVariant(i, { flavour: e.target.value })} />
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor={`size-${x.key}`}>{v.category === "WELLNESS_BOX" ? "Box" : "Size"}</label>
              <input id={`size-${x.key}`} type="text" required maxLength={40} value={x.size} onChange={(e) => setVariant(i, { size: e.target.value })} />
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor={`price-${x.key}`}>Price (₦)</label>
              <input id={`price-${x.key}`} type="number" required min="1" step="0.01" value={x.price} onChange={(e) => setVariant(i, { price: e.target.value })} />
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor={`photo-${x.key}`}>Photo</label>
              <select id={`photo-${x.key}`} value={x.imageUrl ?? ""} onChange={(e) => setVariant(i, { imageUrl: e.target.value || null })} disabled={!v.images.length}>
                <option value="">Main photo</option>
                {v.images.map((url, n) => (
                  <option key={url} value={url}>
                    Photo {n + 1}
                  </option>
                ))}
              </select>
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
          onClick={() => set("variants", [...v.variants, { key: key(), flavour: "", size: "", price: "", isAvailable: true, imageUrl: null }])}
        >
          {v.category === "WELLNESS_BOX" ? "Add tier" : "Add flavour and size"}
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
