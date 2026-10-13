import { Shell } from "@/components/Shell";
import { requireRole } from "@/lib/session";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/delivery", label: "Delivery fees" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/ythirst", label: "Ythirst" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/announcements", label: "Announcements" },
];

// The layout check is for the frame only; every page and action checks again,
// since layouts don't re-run on every navigation or guard server actions.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return (
    <Shell label="Admin" name={user.name} links={LINKS}>
      {children}
    </Shell>
  );
}
