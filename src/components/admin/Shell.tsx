import { NavLinks } from "./NavLinks";

export function Shell({ name, links, children }: { name: string; links: { href: string; label: string; badge?: number }[]; children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Yogurmac</div>
        <div className="brand-sub">Admin</div>
        <NavLinks links={links} />
        <div className="side-foot">
          <span>{name}</span>
          <div className="side-links">
            <a className="link small" href="/" target="_blank" rel="noopener noreferrer">
              View shop
            </a>
            <form action="/admin/sign-out" method="post">
              <button className="link small">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="main" id="content">
        {children}
      </div>
    </div>
  );
}
