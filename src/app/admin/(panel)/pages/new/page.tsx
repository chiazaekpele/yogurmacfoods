import type { Metadata } from "next";
import { PageEditor } from "@/components/admin/PageEditor";
import { PageHead } from "@/components/admin/PageHead";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "New page" };

export default async function NewInfoPage() {
  await requireAdmin();
  return (
    <div>
      <PageHead eyebrow="Pages" title="New page" />
      <PageEditor
        pageId={null}
        initial={{
          title: "",
          intro: "",
          isPublished: false,
          blocks: [
            { type: "text", heading: "", body: "", imageUrl: null },
            { type: "team", heading: "Our team", members: [{ name: "", role: "", bio: "", photoUrl: null }] },
          ],
        }}
      />
    </div>
  );
}
