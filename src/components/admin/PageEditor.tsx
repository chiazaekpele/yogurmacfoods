"use client";

import { useActionState, useState } from "react";
import { savePage, type PageSaveState } from "@/app/admin/(panel)/pages/actions";
import { uploadImage } from "@/lib/admin/upload-client";
import { type GalleryImage, type InfoPageInput, PAGE_KIND_INFO, type TeamMember, type TextBlock } from "@/lib/info-pages";

// Rows from the server get index keys (the same on server and client, so
// hydration matches); rows added in the browser get fresh ones.
let nextKey = 0;
const newKey = () => `new${nextKey++}`;
type Keyed<T> = T & { key: string };
type EditorBlock =
  | Keyed<TextBlock>
  | Keyed<{ type: "team"; heading: string; members: Keyed<TeamMember>[] }>
  | Keyed<{ type: "gallery"; heading: string; images: Keyed<GalleryImage>[] }>;

const SECTION_LABEL = { text: "Text", team: "Team", gallery: "Gallery" } as const;
const blankMember = (): Keyed<TeamMember> => ({ key: newKey(), name: "", role: "", bio: "", photoUrl: null });
const newSection = (type: EditorBlock["type"]): EditorBlock =>
  type === "text"
    ? { key: newKey(), type, heading: "", body: "", imageUrl: null }
    : type === "team"
      ? { key: newKey(), type, heading: "", members: [blankMember()] }
      : { key: newKey(), type, heading: "", images: [] };

const moveItem = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

function UploadButton({ label, multiple, onUploaded }: { label: string; multiple?: boolean; onUploaded: (urls: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="upload-btn">
      <label className="btn btn-ghost btn-sm" style={{ cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          hidden
          disabled={busy}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length) return;
            setError(null);
            setBusy(true);
            const urls: string[] = [];
            try {
              for (const f of files) urls.push(await uploadImage(f));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed.");
            } finally {
              if (urls.length) onUploaded(urls);
              setBusy(false);
            }
          }}
        />
      </label>
      {error && <span className="err">{error}</span>}
    </span>
  );
}

function PhotoPicker({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  return (
    <div className="photo-pick">
      {url ? <img src={url} alt="" /> : <div className="photo-empty">No photo</div>}
      <div className="row" style={{ gap: 6 }}>
        <UploadButton label={url ? "Change" : "Add photo"} onUploaded={([u]) => onChange(u)} />
        {url && (
          <button type="button" className="link small" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// Small up / down / remove controls for an item in a list.
function ItemControls({ index, count, onMove, onRemove, removeLabel }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Move up">
        ↑
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Move down">
        ↓
      </button>
      <button type="button" className="link small" onClick={onRemove}>
        {removeLabel}
      </button>
    </div>
  );
}

export function PageEditor({ pageId, initial }: { pageId: string | null; initial: InfoPageInput }) {
  const [state, action, pending] = useActionState<PageSaveState, FormData>(savePage.bind(null, pageId), null);
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro);
  const [isPublished, setPublished] = useState(initial.isPublished);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
    initial.blocks.map((b, i): EditorBlock => {
      if (b.type === "team") return { ...b, key: `b${i}`, members: b.members.map((m, j) => ({ ...m, key: `b${i}m${j}` })) };
      if (b.type === "gallery") return { ...b, key: `b${i}`, images: b.images.map((g, j) => ({ ...g, key: `b${i}g${j}` })) };
      return { ...b, key: `b${i}` };
    }),
  );

  // Updates one section; `fn` gets the section and returns its new value.
  const edit = (i: number, fn: (b: EditorBlock) => EditorBlock) => setBlocks((bs) => bs.map((b, j) => (j === i ? fn(b) : b)));

  const payload = JSON.stringify({
    kind: initial.kind,
    title,
    intro,
    isPublished,
    blocks: blocks.map(({ key: _k, ...b }) =>
      b.type === "team"
        ? { ...b, members: b.members.map(({ key: _m, ...m }) => m) }
        : b.type === "gallery"
          ? { ...b, images: b.images.map(({ key: _g, ...g }) => g) }
          : b,
    ),
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
        <div className="field">
          <label htmlFor="title">Page title</label>
          <input id="title" type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`e.g. ${PAGE_KIND_INFO[initial.kind].examples.split(", ")[0]}`} required />
        </div>
        <div className="field">
          <label htmlFor="intro">Introduction (optional)</label>
          <textarea id="intro" maxLength={600} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="One or two sentences shown under the title." />
        </div>
        <label className="check" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={isPublished} onChange={(e) => setPublished(e.target.checked)} /> Show this page on the shop
        </label>
      </div>

      {blocks.map((b, i) => (
        <div className="card" key={b.key}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 className="h2" style={{ margin: 0 }}>
              Section {i + 1}: {SECTION_LABEL[b.type]}
            </h2>
            <div className="row">
              <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => setBlocks((bs) => moveItem(bs, i, i - 1))}>
                Move up
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={i === blocks.length - 1} onClick={() => setBlocks((bs) => moveItem(bs, i, i + 1))}>
                Move down
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}>
                Remove section
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor={`h-${b.key}`}>Heading (optional)</label>
            <input id={`h-${b.key}`} type="text" maxLength={120} value={b.heading} onChange={(e) => edit(i, (x) => ({ ...x, heading: e.target.value }))} />
          </div>

          {b.type === "text" && (
            <div className="text-block-edit">
              <div className="field">
                <label htmlFor={`t-${b.key}`}>Text</label>
                <textarea
                  id={`t-${b.key}`}
                  rows={7}
                  maxLength={5000}
                  value={b.body}
                  onChange={(e) => edit(i, (x) => ({ ...x, body: e.target.value }) as EditorBlock)}
                  placeholder="Leave a blank line between paragraphs."
                />
              </div>
              <div className="field">
                <span className="label">Photo beside the text (optional)</span>
                <PhotoPicker url={b.imageUrl} onChange={(url) => edit(i, (x) => ({ ...x, imageUrl: url }) as EditorBlock)} />
              </div>
            </div>
          )}

          {b.type === "team" && (
            <>
              {b.members.map((m, k) => {
                const setMember = (patch: Partial<TeamMember>) =>
                  edit(i, (x) => (x.type === "team" ? { ...x, members: x.members.map((y, q) => (q === k ? { ...y, ...patch } : y)) } : x));
                return (
                  <div className="member-edit" key={m.key}>
                    <PhotoPicker url={m.photoUrl} onChange={(url) => setMember({ photoUrl: url })} />
                    <div>
                      <div className="grid grid-2">
                        <div className="field">
                          <label htmlFor={`n-${m.key}`}>Name</label>
                          <input id={`n-${m.key}`} type="text" maxLength={80} value={m.name} onChange={(e) => setMember({ name: e.target.value })} />
                        </div>
                        <div className="field">
                          <label htmlFor={`r-${m.key}`}>Role</label>
                          <input id={`r-${m.key}`} type="text" maxLength={80} value={m.role} onChange={(e) => setMember({ role: e.target.value })} placeholder="e.g. Founder & CEO" />
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor={`bio-${m.key}`}>Short bio (optional)</label>
                        <textarea id={`bio-${m.key}`} rows={3} maxLength={600} value={m.bio} onChange={(e) => setMember({ bio: e.target.value })} />
                      </div>
                      <ItemControls
                        index={k}
                        count={b.members.length}
                        removeLabel={`Remove ${m.name || "this person"}`}
                        onMove={(to) => edit(i, (x) => (x.type === "team" ? { ...x, members: moveItem(x.members, k, to) } : x))}
                        onRemove={() => edit(i, (x) => (x.type === "team" ? { ...x, members: x.members.filter((_, q) => q !== k) } : x))}
                      />
                    </div>
                  </div>
                );
              })}
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => edit(i, (x) => (x.type === "team" ? { ...x, members: [...x.members, blankMember()] } : x))}>
                Add a person
              </button>
            </>
          )}

          {b.type === "gallery" && (
            <>
              {b.images.length === 0 && <p className="hint">No photos yet. You can choose several at once.</p>}
              <div className="gallery-edit">
                {b.images.map((g, k) => (
                  <div className="gallery-item" key={g.key}>
                    <img src={g.url} alt="" />
                    <input
                      type="text"
                      maxLength={160}
                      value={g.caption}
                      aria-label={`Caption for photo ${k + 1}`}
                      placeholder="Caption (optional)"
                      onChange={(e) => edit(i, (x) => (x.type === "gallery" ? { ...x, images: x.images.map((y, q) => (q === k ? { ...y, caption: e.target.value } : y)) } : x))}
                    />
                    <ItemControls
                      index={k}
                      count={b.images.length}
                      removeLabel="Remove"
                      onMove={(to) => edit(i, (x) => (x.type === "gallery" ? { ...x, images: moveItem(x.images, k, to) } : x))}
                      onRemove={() => edit(i, (x) => (x.type === "gallery" ? { ...x, images: x.images.filter((_, q) => q !== k) } : x))}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <UploadButton
                  label="Add photos"
                  multiple
                  onUploaded={(urls) => edit(i, (x) => (x.type === "gallery" ? { ...x, images: [...x.images, ...urls.map((url) => ({ key: newKey(), url, caption: "" }))] } : x))}
                />
              </div>
            </>
          )}
        </div>
      ))}

      <div className="card add-section">
        <span className="label">Add a section</span>
        <div className="row">
          {(["text", "team", "gallery"] as const).map((t) => (
            <button key={t} type="button" className="btn btn-ghost btn-sm" onClick={() => setBlocks((bs) => [...bs, newSection(t)])}>
              {SECTION_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save page"}
        </button>
        <a className="btn btn-ghost" href="/admin/pages">
          Cancel
        </a>
      </div>
    </form>
  );
}
