import { NavLinks } from "./NavLinks";

export function Shell({
  label,
  name,
  links,
  children,
}: {
  label: string;
  name: string;
  links: { href: string; label: string; badge?: number }[];
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="shell">
        <aside className="side">
          <div className="brand">Yogurmac</div>
          <div className="brand-sub">{label}</div>
          <NavLinks links={links} />
          <div className="side-foot">
            <span>{name}</span>
            <form action="/logout" method="post">
              <button className="link small">Sign out</button>
            </form>
          </div>
        </aside>
        <main className="main" id="content">
          {children}
        </main>
      </div>
    </>
  );
}
