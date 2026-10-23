import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/PageEditor";
import { PageHead } from "@/components/admin/PageHead";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { PAGE_KIND_INFO, readBlocks } from "@/lib/info-pages";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditInfoPage({ params }: PageProps<"/admin/pages/[id]">) {
  await requireAdmin();
  const page = await db.infoPage.findUnique({ where: { id: (await params).id } });
  if (!page) notFound();
  return (
    <div>
      <PageHead eyebrow={PAGE_KIND_INFO[page.kind].label} title={`Edit ${page.title}`} />
      <PageEditor pageId={page.id} initial={{ kind: page.kind, title: page.title, intro: page.intro ?? "", isPublished: page.isPublished, blocks: readBlocks(page.blocks) }} />
    </div>
  );
}
