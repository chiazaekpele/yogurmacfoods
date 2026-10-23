"use client";

import { useActionState, useState } from "react";
import { savePage, type PageSaveState } from "@/app/admin/(panel)/pages/actions";
import { uploadImage } from "@/lib/admin/upload-client";
import type { Block, InfoPageInput, TeamMember } from "@/lib/info-pages";

// Rows from the server get index keys (same on server and client, so hydration
// matches); rows added in the browser get fresh ones.
let nextKey = 0;
const newKey = () => `new${nextKey++}`;
type Keyed<T> = T & { key: string };
type EditorBlock = Keyed<Exclude<Block, { type: "team" }>> | Keyed<{ type: "team"; heading: string; members: Keyed<TeamMember>[] }>;

const blankMember = (): Keyed<TeamMember> => ({ key: newKey(), name: "", role: "", bio: "", photoUrl: null });

function PhotoPicker({ url, onChange, label }: { url: string | null; onChange: (url: string | null) => void; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="photo-pick">
      {url ? <img src={url} alt="" /> : <div className="photo-empty">No photo</div>}
      <div className="row" style={{ gap: 6 }}>
        <label className="btn btn-ghost btn-sm" style={{ cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Uploading…" : url ? "Change" : label}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setError(null);
              setBusy(true);
              try {
                onChange(await uploadImage(f));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {url && (
          <button type="button" className="link small" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      {error && <span className="err">{error}</span>}
    </div>
  );
}

export function PageEditor({ pageId, initial }: { pageId: string | null; initial: InfoPageInput }) {
  const [state, action, pending] = useActionState<PageSaveState, FormData>(savePage.bind(null, pageId), null);
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro);
  const [isPublished, setPublished] = useState(initial.isPublished);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
    initial.blocks.map((b, i) =>
      b.type === "team" ? { ...b, key: `b${i}`, members: b.members.map((m, j) => ({ ...m, key: `b${i}m${j}` })) } : { ...b, key: `b${i}` },
    ),
  );

  const update = (i: number, patch: Partial<EditorBlock>) => setBlocks((bs) => bs.map((b, j) => (j === i ? ({ ...b, ...patch } as EditorBlock) : b)));
  const move = (i: number, d: number) =>
    setBlocks((bs) => {
      const next = [...bs];
      const [b] = next.splice(i, 1);
      next.splice(i + d, 0, b);
      return next;
    });
  const setMember = (i: number, m: number, patch: Partial<TeamMember>) =>
    setBlocks((bs) => bs.map((b, j) => (j === i && b.type === "team" ? { ...b, members: b.members.map((x, k) => (k === m ? { ...x, ...patch } : x)) } : b)));

  const payload = JSON.stringify({
    title,
    intro,
    isPublished,
    blocks: blocks.map(({ key: _k, ...b }) => (b.type === "team" ? { ...b, members: b.members.map(({ key: _m, ...m }) => m) } : b)),
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
          <input id="title" type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Our Team" required />
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
              Section {i + 1}: {b.type === "team" ? "Team" : "Text"}
            </h2>
            <div className="row">
              <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)}>
                Move up
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                Move down
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor={`h-${b.key}`}>Heading</label>
            <input id={`h-${b.key}`} type="text" maxLength={120} value={b.heading} onChange={(e) => update(i, { heading: e.target.value })} />
          </div>

          {b.type === "text" ? (
            <div className="text-block-edit">
              <div className="field">
                <label htmlFor={`t-${b.key}`}>Text</label>
                <textarea id={`t-${b.key}`} rows={7} maxLength={5000} value={b.body} onChange={(e) => update(i, { body: e.target.value })} placeholder="Leave a blank line between paragraphs." />
              </div>
              <div className="field">
                <span className="label">Photo beside the text (optional)</span>
                <PhotoPicker url={b.imageUrl} label="Add photo" onChange={(url) => update(i, { imageUrl: url })} />
              </div>
            </div>
          ) : (
            <>
              {b.members.map((m, k) => (
                <div className="member-edit" key={m.key}>
                  <PhotoPicker url={m.photoUrl} label="Add photo" onChange={(url) => setMember(i, k, { photoUrl: url })} />
                  <div>
                    <div className="grid grid-2">
                      <div className="field">
                        <label htmlFor={`n-${m.key}`}>Name</label>
                        <input id={`n-${m.key}`} type="text" maxLength={80} value={m.name} onChange={(e) => setMember(i, k, { name: e.target.value })} />
                      </div>
                      <div className="field">
                        <label htmlFor={`r-${m.key}`}>Role</label>
                        <input id={`r-${m.key}`} type="text" maxLength={80} value={m.role} onChange={(e) => setMember(i, k, { role: e.target.value })} placeholder="e.g. Founder & CEO" />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`bio-${m.key}`}>Short bio (optional)</label>
                      <textarea id={`bio-${m.key}`} rows={3} maxLength={600} value={m.bio} onChange={(e) => setMember(i, k, { bio: e.target.value })} />
                    </div>
                    <button
                      type="button"
                      className="link small"
                      onClick={() => setBlocks((bs) => bs.map((x, j) => (j === i && x.type === "team" ? { ...x, members: x.members.filter((_, q) => q !== k) } : x)))}
                    >
                      Remove {m.name || "this person"}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setBlocks((bs) => bs.map((x, j) => (j === i && x.type === "team" ? { ...x, members: [...x.members, blankMember()] } : x)))}
              >
                Add a person
              </button>
            </>
          )}
        </div>
      ))}

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => setBlocks((bs) => [...bs, { key: newKey(), type: "text", heading: "", body: "", imageUrl: null }])}>
          Add text section
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setBlocks((bs) => [...bs, { key: newKey(), type: "team", heading: "Our team", members: [blankMember()] }])}>
          Add team section
        </button>
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
