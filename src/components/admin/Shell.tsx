import { AdminMenu, type MenuGroup } from "./AdminMenu";

export function Shell({ name, groups, children }: { name: string; groups: MenuGroup[]; children: React.ReactNode }) {
  return (
    <div className="frame">
      <AdminMenu name={name} groups={groups} />
      <div className="main" id="content">
        {children}
      </div>
    </div>
  );
}
