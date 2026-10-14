import { Shell } from "@/components/admin/Shell";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/session";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/products", label: "Products & boxes" },
  { href: "/admin/hero", label: "Homepage images" },
  { href: "/admin/delivery", label: "Delivery fees" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/ythirst", label: "Ythirst" },
];

// The layout check is for the frame only; every page and action checks again,
// since layouts don't re-run on every navigation or guard server actions.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const waiting = await db.order.count({ where: { status: "CONFIRMED" } });
  return (
    <Shell name={admin.name} links={LINKS.map((l) => (l.href === "/admin/orders" ? { ...l, badge: waiting } : l))}>
      {children}
    </Shell>
  );
}
