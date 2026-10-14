import type { OrderStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/admin/order-status";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge b-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}
