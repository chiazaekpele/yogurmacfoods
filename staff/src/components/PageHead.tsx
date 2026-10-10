export function PageHead({ eyebrow, title, lede, children }: { eyebrow?: string; title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <div className="row-between" style={{ alignItems: "flex-end", marginBottom: 4 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {children && <div className="row" style={{ marginBottom: 18 }}>{children}</div>}
    </div>
  );
}
