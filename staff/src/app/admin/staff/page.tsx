import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/lagos-time";
import { requireRole } from "@/lib/session";
import { deactivateStaff, inviteStaff, resendInvite } from "./actions";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffListPage({ searchParams }: PageProps<"/admin/staff">) {
  await requireRole("ADMIN");
  const staff = await db.user.findMany({ where: { role: "STAFF" }, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  const now = new Date();

  return (
    <div className="stack">
      <PageHead title="Staff" lede={`${staff.filter((s) => s.isActive).length} active of up to 30.`} />
      <Flash searchParams={searchParams} />

      <details className="card">
        <summary>Invite a staff member</summary>
        <form action={inviteStaff} style={{ marginTop: 12, maxWidth: 480 }}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" required maxLength={100} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="off" />
            <span className="hint">They’ll get a link to set their password. It expires in 24 hours.</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <SubmitButton pendingText="Sending…">Send invite</SubmitButton>
          </div>
        </form>
      </details>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const invited = !s.isActive && !s.deactivatedAt;
              const expired = invited && (!s.inviteExpiry || s.inviteExpiry < now);
              return (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/staff/${s.id}`}>
                      <strong>{s.name}</strong>
                    </Link>
                  </td>
                  <td className="small">{s.email}</td>
                  <td>
                    {s.isActive ? (
                      <span className="badge b-on">Active</span>
                    ) : invited ? (
                      <span className={`badge ${expired ? "b-warn" : "b-pending"}`}>{expired ? "Invite expired" : "Invited"}</span>
                    ) : (
                      <span className="badge b-off">Deactivated</span>
                    )}
                  </td>
                  <td className="small">{formatDate(s.createdAt)}</td>
                  <td className="small">{s.lastActiveAt ? formatDateTime(s.lastActiveAt) : "—"}</td>
                  <td>
                    {s.isActive ? (
                      <form action={deactivateStaff}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton className="btn btn-sm btn-danger" pendingText="…" confirm={`Deactivate ${s.name}? They will be signed out immediately.`}>
                          Deactivate
                        </SubmitButton>
                      </form>
                    ) : (
                      <form action={resendInvite}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton className="btn btn-sm btn-ghost" pendingText="Sending…">
                          {invited ? "Resend invite" : "Re-invite"}
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No staff yet. Invite your first team member above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
