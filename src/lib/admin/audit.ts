import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// AuditLog is insert-only (TRD §5.5): nothing in the app updates or deletes it.
// Call inside the same transaction as the change it records.
export function audit(
  tx: Tx,
  entry: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    previousValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({ data: entry });
}
