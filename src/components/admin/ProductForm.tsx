"use client";

import { useActionState, useState } from "react";
import { saveProductAction, type SaveState } from "@/app/admin/(panel)/products/actions";
import { uploadImage } from "@/lib/admin/upload-client";
import type { CategoryOption } from "@/lib/admin/product-meta";

type Variant = {
  key: string;
  id?: string;
  flavour: string;
  size: string;
  price: string;
  isAvailable: boolean;
  imageUrl: string | null;
  contents: string;
};
export type ProductFormValue = {
  name: string;
  categoryId: string;
  description: string;
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  variants: Omit<Variant, "key">[];
};

const NEW = "__new";
// Rows from the server get index keys (the same on server and client, so
// hydration matches); rows added in the browser get fresh ones.
let nextKey = 0;
const key = () => `new${nextKey++}`;
const blankVariant = (isBox: boolean): Variant => ({ key: key(), flavour: "", size: isBox ? "Box" : "", price: "", isAvailable: true, imageUrl: null, contents: "" });

export function ProductForm({ productId, initial, categories }: { productId: string | null; initial: ProductFormValue; categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProductAction.bind(null, productId), null);
  const [v, setV] = useState({ ...initial, variants: initial.variants.map((x, i) => ({ ...x, key: `v${i}` })) });
  const [newCategory, setNewCategory] = useState({ name: "", isBox: false });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));
  const setVariant = (i: number, patch: Partial<Variant>) => set("variants", v.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const isNewCategory = v.categoryId === NEW;
  const isBox = isNewCategory ? newCategory.isBox : !!categories.find((c) => c.id === v.categoryId)?.isBox;

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
    categoryId: isNewCategory ? null : v.categoryId || null,
    newCategory: isNewCategory ? newCategory : null,
    description: v.description,
    images: v.images,
    isFeatured: v.isFeatured,
    isActive: v.isActive,
    variants: v.variants.map(({ key: _k, ...x }) => ({ ...x, size: isBox ? x.size || "Box" : x.size, contents: isBox ? x.contents : "" })),
  });

  const photoSelect = (x: Variant, i: number) => (
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
  );
  const removeButton = (i: number) => (
    <button type="button" className="btn btn-sm btn-danger" disabled={v.variants.length === 1} onClick={() => set("variants", v.variants.filter((_, j) => j !== i))}>
      Remove
    </button>
  );

  return (
    <form action={action} className="stack">
      <input type="hidden" name="payload" value={payload} />
      {state?.error && (
        <div className="form-err" role="alert">
          {state.error}
        </div>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="name">Product name</label>
          <input id="name" type="text" required maxLength={120} value={v.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {!v.categoryId && <option value="">Choose a category</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isBox ? " (boxes with tiers)" : ""}
              </option>
            ))}
            <option value={NEW}>New category…</option>
          </select>
        </div>
        {isNewCategory && (
          <div className="subcard">
            <div className="field">
              <label htmlFor="new-category">New category name</label>
              <input id="new-category" type="text" maxLength={60} value={newCategory.name} onChange={(e) => setNewCategory((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Breakfast Packages" />
            </div>
            <label className="check" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={newCategory.isBox} onChange={(e) => setNewCategory((c) => ({ ...c, isBox: e.target.checked }))} /> Sold as boxes with tiers
            </label>
            <p className="hint" style={{ marginTop: 4 }}>
              Box categories show tiers with their contents, can be delivered daily, and count towards the Ythirst boxes counter.
            </p>
          </div>
        )}
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
          Up to 5 images (JPG, PNG or WEBP, 4 MB each). Drag to reorder; the first photo is the main one.
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

      {isBox ? (
        <div className="card">
          <h2 className="h2">Tiers</h2>
          <p className="hint">Each tier is one box a customer can buy. List what’s in it, one item per line; customers see this when they pick the tier. Price changes don’t affect past orders.</p>
          {v.variants.map((x, i) => (
            <div className="subcard" key={x.key} style={{ marginTop: 14 }}>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <h3 className="h3">Tier {i + 1}{x.flavour ? `: ${x.flavour}` : ""}</h3>
                {removeButton(i)}
              </div>
              <div className="grid grid-3">
                <div className="field">
                  <label htmlFor={`flavour-${x.key}`}>Tier name</label>
                  <input id={`flavour-${x.key}`} type="text" required maxLength={60} value={x.flavour} onChange={(e) => setVariant(i, { flavour: e.target.value })} placeholder="e.g. Gold (Premium)" />
                </div>
                <div className="field">
                  <label htmlFor={`price-${x.key}`}>Price per box (₦)</label>
                  <input id={`price-${x.key}`} type="number" required min="1" step="0.01" value={x.price} onChange={(e) => setVariant(i, { price: e.target.value })} />
                </div>
                {photoSelect(x, i)}
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor={`contents-${x.key}`}>What’s in the box</label>
                <textarea
                  id={`contents-${x.key}`}
                  maxLength={2000}
                  value={x.contents}
                  onChange={(e) => setVariant(i, { contents: e.target.value })}
                  placeholder={"Greek yogurt parfait\nCranola granola jar\n2 Ridi energy bars"}
                />
              </div>
              <label className="check" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={x.isAvailable} onChange={(e) => setVariant(i, { isAvailable: e.target.checked })} /> Available
              </label>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => set("variants", [...v.variants, blankVariant(true)])}>
            Add tier
          </button>
        </div>
      ) : (
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
              {photoSelect(x, i)}
              <label className="check" style={{ paddingBottom: 10 }}>
                <input type="checkbox" checked={x.isAvailable} onChange={(e) => setVariant(i, { isAvailable: e.target.checked })} /> Available
              </label>
              <div style={{ paddingBottom: 6 }}>{removeButton(i)}</div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => set("variants", [...v.variants, blankVariant(false)])}>
            Add flavour and size
          </button>
        </div>
      )}

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
