import type { Metadata } from "next";
import { Flash } from "@/components/Flash";
import { PageHead } from "@/components/PageHead";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/lagos-time";
import { formatNaira } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { saveFee } from "./actions";

export const metadata: Metadata = { title: "Delivery fees" };

export default async function DeliveryPage({ searchParams }: PageProps<"/admin/delivery">) {
  await requireRole("ADMIN");
  const rates = await db.lGAShippingRate.findMany({ orderBy: { lgaName: "asc" } });
  return (
    <div>
      <PageHead
        title="Delivery fees"
        lede="The fee charged for each Lagos LGA. Changes apply to checkout straight away. Leave a fee empty to stop taking orders for that LGA."
      />
      <Flash searchParams={searchParams} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>LGA</th>
              <th>Current fee</th>
              <th>New fee (₦)</th>
              <th>Last changed</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.lgaName}</strong>
                </td>
                <td>{r.shippingFee ? formatNaira(r.shippingFee.toString()) : <span className="badge b-warn">Not delivering</span>}</td>
                <td>
                  <form action={saveFee} className="row" style={{ flexWrap: "nowrap" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      name="fee"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={r.shippingFee?.toString() ?? ""}
                      aria-label={`Delivery fee for ${r.lgaName}`}
                      style={{ maxWidth: 130 }}
                    />
                    <SubmitButton className="btn btn-sm">Save</SubmitButton>
                  </form>
                </td>
                <td className="small muted">{formatDateTime(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
