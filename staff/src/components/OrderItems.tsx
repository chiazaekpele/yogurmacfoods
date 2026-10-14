export function OrderItems({ items }: { items: { id: string; productName: string; flavour: string; size: string; quantity: number; days: number }[] }) {
  return (
    <ul style={{ listStyle: "none" }}>
      {items.map((i) => (
        <li key={i.id} style={{ padding: "4px 0" }}>
          <strong style={{ fontFamily: "var(--cond)", fontSize: 18 }}>{i.quantity}×</strong> {i.productName} <span className="muted">· {i.flavour} · {i.size}</span>
          {i.days > 1 && <strong> · one a day for {i.days} days</strong>}
        </li>
      ))}
    </ul>
  );
}
