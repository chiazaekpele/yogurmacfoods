import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { sendOrderConfirmation } from "./email";
import { fromKobo, toKobo } from "./money";
import { isPaystackConfigured, verifyTransaction } from "./paystack";

// Processing for Paystack webhook events (TRD §7.3, §8). The HTTP route verifies
// the signature and IP, then hands the parsed event here. The simulated payment
// page calls this directly when Paystack keys are not configured.

export type PaystackEvent = { event: string; data: Record<string, any> };

type SideEffect = () => Promise<void>;

export function dedupeKey(e: PaystackEvent): string {
  const d = e.data ?? {};
  return `${e.event}:${d.id ?? d.reference ?? "unknown"}`;
}

export async function handlePaystackEvent(e: PaystackEvent): Promise<void> {
  const key = dedupeKey(e);
  let event = await db.webhookEvent.findUnique({ where: { dedupeKey: key } });
  if (event?.processed) return; // duplicate delivery: nothing to do

  if (!event) {
    try {
      event = await db.webhookEvent.create({
        data: {
          eventType: e.event,
          dedupeKey: key,
          paystackRef: e.data?.reference ?? null,
          payload: e as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // A concurrent delivery inserted it first; let that one finish.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
      throw err;
    }
  }

  const result = await dispatch(e);
  await db.webhookEvent.update({
    where: { id: event.id },
    data: { processed: true, processedAt: new Date(), note: result.note ?? null },
  });

  // Emails go out only after the database work is committed.
  for (const effect of result.effects) await effect();
}

// Fallback for a missing or late webhook: when the customer is back on their
// order page, ask Paystack about the payment and, if it succeeded, process it
// exactly as the webhook would. Same dedupe key as the webhook (event + the
// transaction id), so whichever arrives second does nothing.
const lastCheck = new Map<string, number>();
const CHECK_EVERY_MS = 5000;

export async function confirmFromPaystack(orderId: string): Promise<boolean> {
  if (!isPaystackConfigured()) return false;
  const now = Date.now();
  if (now - (lastCheck.get(orderId) ?? 0) < CHECK_EVERY_MS) return false;
  lastCheck.set(orderId, now);
  try {
    const data = await verifyTransaction(orderId);
    if (data.status !== "success") return false;
    await handlePaystackEvent({ event: "charge.success", data });
    return !!(await db.order.findUnique({ where: { orderId }, select: { id: true } }));
  } catch (err) {
    console.error(`Paystack verify for ${orderId} failed:`, err);
    return false;
  }
}

type DispatchResult = { effects: SideEffect[]; note?: string };

async function dispatch(e: PaystackEvent): Promise<DispatchResult> {
  // Shop orders are the only payments now (donations and monthly tiers were
  // retired on 13 Oct 2026); any other event is recorded and ignored.
  if (e.event === "charge.success") return orderCharge(e.data);
  return { effects: [], note: "ignored event type" };
}

// ── One-time orders ───────────────────────────────────────────────────────────

type PendingItem = {
  variantId: string;
  quantity: number;
  days?: number;
  unitPrice: string;
  productName: string;
  flavour: string;
  size: string;
};

async function orderCharge(data: Record<string, any>): Promise<DispatchResult> {
  const reference = String(data.reference ?? "");
  const pending = await db.pendingCheckout.findUnique({ where: { orderId: reference } });

  if (!pending) {
    await alert("ORPHAN_PAYMENT", `Paystack payment ${reference} (${fromKobo(Number(data.amount ?? 0))} NGN) has no pending checkout.`, reference);
    return { effects: [], note: "no pending checkout" };
  }

  const existing = await db.order.findUnique({ where: { orderId: reference } });
  if (existing) return { effects: [emailEffect(existing.id)], note: "order already exists" };

  const expected = toKobo(pending.total);
  if (data.status !== "success" || data.currency !== "NGN" || Number(data.amount) !== expected) {
    await alert(
      "PAYMENT_MISMATCH",
      `Payment ${reference} did not match its checkout: status ${data.status}, ${data.currency} ${data.amount} kobo, expected NGN ${expected} kobo.`,
      reference,
    );
    return { effects: [], note: "payment mismatch" };
  }

  const items = pending.items as unknown as PendingItem[];
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderId: pending.orderId,
        customerId: pending.customerId,
        customerName: pending.customerName,
        customerEmail: pending.customerEmail,
        customerPhone: pending.customerPhone,
        lga: pending.lga,
        exactAddress: pending.exactAddress,
        landmark: pending.landmark,
        subtotal: pending.subtotal,
        shippingFee: pending.shippingFee,
        vatRate: pending.vatRate,
        vat: pending.vat,
        fulfilment: pending.fulfilment,
        total: pending.total,
        amountPaid: fromKobo(Number(data.amount)),
        paystackRef: reference,
        items: {
          create: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            days: i.days ?? 1,
            unitPrice: i.unitPrice,
            productName: i.productName,
            flavour: i.flavour,
            size: i.size,
          })),
        },
      },
    });
    await tx.pendingCheckout.update({ where: { id: pending.id }, data: { consumedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        action: "ORDER_CREATED",
        entityType: "Order",
        entityId: created.id,
        newValue: { orderId: created.orderId, status: created.status, total: created.total.toString() },
      },
    });
    return created;
  });

  return { effects: [emailEffect(order.id)] };
}

function emailEffect(orderDbId: string): SideEffect {
  return async () => {
    await sendOrderEmail(orderDbId);
  };
}

// Sends the confirmation once (emailSent guards repeats). Also used by the
// admin's "Resend email" button.
export async function sendOrderEmail(orderDbId: string): Promise<{ ok: boolean; error?: string }> {
  const order = await db.order.findUnique({ where: { id: orderDbId }, include: { items: true } });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.emailSent) return { ok: true };
  try {
    await sendOrderConfirmation({
      ...order,
      subtotal: order.subtotal.toString(),
      shippingFee: order.shippingFee.toString(),
      vatRate: order.vatRate.toString(),
      vat: order.vat.toString(),
      total: order.total.toString(),
      items: order.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString() })),
    });
    await db.order.update({ where: { id: order.id }, data: { emailSent: true, emailError: null } });
    return { ok: true };
  } catch (err) {
    // The order stands; the admin dashboard lists unsent confirmations with a resend button.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Order confirmation email failed for ${order.orderId}:`, message);
    await db.order.update({ where: { id: order.id }, data: { emailError: message.slice(0, 500) } });
    return { ok: false, error: message };
  }
}

async function alert(type: string, message: string, reference?: string) {
  console.error(`[alert:${type}] ${message}`);
  await db.systemAlert.create({ data: { type, message, reference } });
}
