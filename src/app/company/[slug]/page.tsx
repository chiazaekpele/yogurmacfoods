import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { readBlocks } from "@/lib/info-pages";

// The owner's own pages, built in the admin (Pages).
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

async function getPage(slug: string) {
  return db.infoPage.findFirst({ where: { slug, isPublished: true } });
}

export async function generateMetadata({ params }: PageProps<"/company/[slug]">): Promise<Metadata> {
  const page = await getPage((await params).slug);
  return page ? { title: page.title, description: page.intro?.slice(0, 160) } : {};
}

const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export default async function CompanyPage({ params }: PageProps<"/company/[slug]">) {
  const page = await getPage((await params).slug);
  if (!page) notFound();
  const blocks = readBlocks(page.blocks);
  let textIndex = 0;

  return (
    <>
      <div className="page-head">
        <span className="kicker">Yogurmac Foods</span>
        <h1 className="page-h1">{page.title}</h1>
        {page.intro && <p className="page-lede">{page.intro}</p>}
      </div>

      {blocks.map((b, i) => {
        if (b.type === "text") {
          const reverse = textIndex++ % 2 === 1;
          const body = (
            <div className="split-text">
              {b.heading && <h2 className="section-h2">{b.heading}</h2>}
              <div className="prose">
                {paragraphs(b.body).map((p, k) => (
                  <p key={k}>{p}</p>
                ))}
              </div>
            </div>
          );
          return (
            <section className="section" key={i}>
              {b.imageUrl ? (
                <div className={`split${reverse ? " split-reverse" : ""}`}>
                  <div className="split-media">
                    <Image src={b.imageUrl} alt={b.heading || page.title} fill sizes="(max-width: 860px) 100vw, 50vw" style={{ objectFit: "cover" }} />
                  </div>
                  {body}
                </div>
              ) : (
                <div style={{ maxWidth: 760 }}>{body}</div>
              )}
            </section>
          );
        }
        if (b.type === "gallery") {
          return (
            <section className="section" key={i}>
              {b.heading && <h2 className="section-h2">{b.heading}</h2>}
              <div className="gallery-grid">
                {b.images.map((g, k) => (
                  <figure key={k}>
                    <a href={g.url} target="_blank" rel="noopener noreferrer" className="gallery-photo" aria-label={g.caption ? `Open photo: ${g.caption}` : `Open photo ${k + 1}`}>
                      <Image src={g.url} alt={g.caption || `${page.title}, photo ${k + 1}`} fill sizes="(max-width: 560px) 50vw, (max-width: 1100px) 33vw, 300px" style={{ objectFit: "cover" }} />
                    </a>
                    {g.caption && <figcaption>{g.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          );
        }
        return (
          <section className="section" key={i}>
            {b.heading && <h2 className="section-h2">{b.heading}</h2>}
            <div className="team-grid">
              {b.members.map((m, k) => (
                <figure className="team-member" key={k}>
                  <div className="team-photo">
                    {m.photoUrl ? (
                      <Image src={m.photoUrl} alt={m.name} fill sizes="(max-width: 560px) 50vw, 280px" style={{ objectFit: "cover" }} />
                    ) : (
                      <span aria-hidden>{m.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
                    )}
                  </div>
                  <figcaption>
                    <strong>{m.name}</strong>
                    {m.role && <span className="team-role">{m.role}</span>}
                    {m.bio && <p>{m.bio}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
