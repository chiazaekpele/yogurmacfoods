import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/admin/Flash";
import { PageHead } from "@/components/admin/PageHead";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";
import { PAGE_KIND_INFO } from "@/lib/info-pages";
import { formatDate } from "@/lib/lagos-time";
import { deletePage, movePage } from "./actions";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesList({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdmin();
  const pages = await db.infoPage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return (
    <div className="stack">
      <PageHead title="Pages" lede="Your own pages: standard pages, team pages and photo galleries. Published pages are linked under Company at the bottom of every page.">
        <Link className="btn" href="/admin/pages/new">
          New page
        </Link>
      </PageHead>
      <Flash searchParams={searchParams} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Page</th>
              <th>Type</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.title}</strong>
                </td>
                <td className="small">{PAGE_KIND_INFO[p.kind].label}</td>
                <td>{p.isPublished ? <span className="badge b-on">On the shop</span> : <span className="badge b-off">Draft</span>}</td>
                <td className="small">{formatDate(p.updatedAt)}</td>
                <td>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    {(["up", "down"] as const).map((dir) => (
                      <form action={movePage} key={dir}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="dir" value={dir} />
                        <SubmitButton className="btn btn-sm btn-ghost" pendingText="…" disabled={dir === "up" ? i === 0 : i === pages.length - 1}>
                          {dir === "up" ? "Up" : "Down"}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <Link className="btn btn-sm btn-ghost" href={`/admin/pages/${p.id}`}>
                      Edit
                    </Link>
                    {p.isPublished && (
                      <a className="btn btn-sm btn-ghost" href={`/company/${p.slug}`} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    )}
                    <form action={deletePage}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton className="btn btn-sm btn-danger" pendingText="…" confirm={`Delete ${p.title}? This can’t be undone.`}>
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No pages yet. Create one for your team, your partners or anything else customers should know.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
