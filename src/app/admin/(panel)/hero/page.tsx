import type { Metadata } from "next";
import { AddHeroSlide } from "@/components/admin/AddHeroSlide";
import { Flash } from "@/components/admin/Flash";
import { HeroFields } from "@/components/admin/HeroFields";
import { PageHead } from "@/components/admin/PageHead";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { deleteSlide, moveSlide, saveSlide, toggleSlide } from "./actions";

export const metadata: Metadata = { title: "Homepage images" };

export default async function HeroAdmin({ searchParams }: PageProps<"/admin/hero">) {
  await requireAdmin();
  const slides = await db.heroSlide.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  return (
    <div className="stack">
      <PageHead
        title="Homepage images"
        lede="The banner at the top of the homepage. Images rotate in this order; visitors can also swipe through them. Changes show on the shop straight away."
      />
      <Flash searchParams={searchParams} />

      {slides.map((s, i) => (
        <div key={s.id} className="card" style={s.isActive ? undefined : { opacity: 0.7 }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 className="h2" style={{ margin: 0 }}>
              Image {i + 1} {s.isActive ? <span className="badge b-on">Showing</span> : <span className="badge b-off">Hidden</span>}
            </h2>
            <div className="row">
              <form action={moveSlide}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="dir" value="up" />
                <SubmitButton className="btn btn-ghost btn-sm" pendingText="Moving…" disabled={i === 0}>
                  Move up
                </SubmitButton>
              </form>
              <form action={moveSlide}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="dir" value="down" />
                <SubmitButton className="btn btn-ghost btn-sm" pendingText="Moving…" disabled={i === slides.length - 1}>
                  Move down
                </SubmitButton>
              </form>
              <form action={toggleSlide}>
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton className="btn btn-ghost btn-sm" pendingText="Updating…">
                  {s.isActive ? "Hide" : "Show"}
                </SubmitButton>
              </form>
              <form action={deleteSlide}>
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton className="btn btn-danger btn-sm" pendingText="Removing…" confirm="Remove this image from the homepage?">
                  Remove
                </SubmitButton>
              </form>
            </div>
          </div>
          <form action={saveSlide}>
            <input type="hidden" name="id" value={s.id} />
            <HeroFields
              key={s.updatedAt.toISOString()}
              idPrefix={s.id}
              imageUrl={s.imageUrl}
              initial={{ alt: s.alt, href: s.href, position: s.position ?? "", fit: s.fit, background: s.background ?? "" }}
            />
            <div style={{ marginTop: 14 }}>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </form>
        </div>
      ))}

      <AddHeroSlide />
    </div>
  );
}
