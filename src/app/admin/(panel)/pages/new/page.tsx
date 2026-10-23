import type { Metadata } from "next";
import Link from "next/link";
import { PageEditor } from "@/components/admin/PageEditor";
import { PageHead } from "@/components/admin/PageHead";
import { requireAdmin } from "@/lib/admin/session";
import { PAGE_KIND_INFO, PAGE_KINDS, type PageKind } from "@/lib/info-pages";

export const metadata: Metadata = { title: "New page" };

// Step 1: choose the type of page. Step 2: the editor, started with that
// type's sections.
export default async function NewInfoPage({ searchParams }: PageProps<"/admin/pages/new">) {
  await requireAdmin();
  const { type } = await searchParams;
  const kind = PAGE_KINDS.find((k) => k.toLowerCase() === type) as PageKind | undefined;

  if (!kind) {
    return (
      <div className="stack">
        <div className="small">
          <Link href="/admin/pages">← Pages</Link>
        </div>
        <PageHead title="New page" lede="What kind of page is it? This sets the sections it starts with; you can add other sections to any page later." />
        <div className="kind-grid">
          {PAGE_KINDS.map((k) => (
            <Link key={k} className="kind-card" href={`/admin/pages/new?type=${k.toLowerCase()}`}>
              <strong>{PAGE_KIND_INFO[k].label}</strong>
              <span>{PAGE_KIND_INFO[k].description}</span>
              <span className="small muted">For example: {PAGE_KIND_INFO[k].examples}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/pages/new">← Choose a different type</Link>
      </div>
      <PageHead eyebrow={PAGE_KIND_INFO[kind].label} title="New page" />
      <PageEditor pageId={null} initial={{ kind, title: "", intro: "", isPublished: false, blocks: PAGE_KIND_INFO[kind].starter() }} />
    </div>
  );
}
