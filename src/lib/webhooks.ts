import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { sendOrderConfirmation, sendSubscriptionThanks } from "./email";
import { fromKobo, toKobo } from "./money";

// Processing for Paystack webhook events (TRD §7.3, §8). The HTTP route verifies
// the signature and IP, then hands the parsed event here. The simulated payment
// page calls this directly when Paystack keys are not configured.

export type PaystackEvent = { event: string; data: Record<string, any> };

type SideEffect = () => Promise<void>;

export function dedupeKey(e: PaystackEvent): string {
  const d = e.data ?? {};
  return `${e.event}:${d.id ?? d.subscription_code ?? d.reference ?? "unknown"}`;
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
  if (result.parked) {
    await db.webhookEvent.update({ where: { id: event.id }, data: { note: result.note } });
    return;
  }
  await db.webhookEvent.update({
    where: { id: event.id },
    data: { processed: true, processedAt: new Date(), note: result.note ?? null },
  });

  // Emails go out only after the database work is committed.
  for (const effect of result.effects) await effect();
}

type DispatchResult = { effects: SideEffect[]; note?: string; parked?: boolean };

async function dispatch(e: PaystackEvent): Promise<DispatchResult> {
  switch (e.event) {
    case "charge.success":
      return isSubscriptionCharge(e.data) ? subscriptionCharge(e.data) : orderCharge(e.data);
    case "subscription.create":
      return subscriptionCreate(e.data);
    case "subscription.not_renew":
      return subscriptionUpdate(e.data, { endsAtPeriodEnd: true });
    case "subscription.disable":
      return subscriptionDisable(e.data);
    case "invoice.payment_failed":
      return subscriptionUpdate(e.data.subscription ?? e.data, { lastPaymentFailedAt: new Date() });
    default:
      return { effects: [], note: "ignored event type" };
  }
}

function isSubscriptionCharge(data: Record<string, any>): boolean {
  return data.metadata?.type === "subscription" || !!data.plan?.plan_code || !!data.plan_object?.plan_code;
}

// ── One-time orders ───────────────────────────────────────────────────────────

type PendingItem = {
  variantId: string;
  quantity: number;
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
        customerName: pending.customerName,
        customerEmail: pending.customerEmail,
        customerPhone: pending.customerPhone,
        lga: pending.lga,
        exactAddress: pending.exactAddress,
        landmark: pending.landmark,
        subtotal: pending.subtotal,
        shippingFee: pending.shippingFee,
        total: pending.total,
        amountPaid: fromKobo(Number(data.amount)),
        paystackRef: reference,
        items: {
          create: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
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
    const order = await db.order.findUnique({ where: { id: orderDbId }, include: { items: true } });
    if (!order || order.emailSent) return;
    try {
      await sendOrderConfirmation({
        ...order,
        subtotal: order.subtotal.toString(),
        shippingFee: order.shippingFee.toString(),
        total: order.total.toString(),
        items: order.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString() })),
      });
      await db.order.update({ where: { id: order.id }, data: { emailSent: true, emailError: null } });
    } catch (err) {
      // The order stands; the admin dashboard lists unsent confirmations with a resend button.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Order confirmation email failed for ${order.orderId}:`, message);
      await db.order.update({ where: { id: order.id }, data: { emailError: message.slice(0, 500) } });
    }
  };
}

// ── Donation subscriptions ────────────────────────────────────────────────────

async function subscriptionCreate(data: Record<string, any>): Promise<DispatchResult> {
  const planCode = data.plan?.plan_code;
  const tier = planCode ? await db.subscriptionTier.findUnique({ where: { paystackPlanCode: planCode } }) : null;
  if (!tier) {
    await alert("UNKNOWN_PLAN", `Subscription ${data.subscription_code} uses unknown plan ${planCode}.`, data.subscription_code);
    return { effects: [], note: "unknown plan" };
  }

  const customer = data.customer ?? {};
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
  const subscription = await db.subscription.upsert({
    where: { paystackSubscriptionCode: data.subscription_code },
    update: {},
    create: {
      tierId: tier.id,
      subscriberName: name,
      subscriberEmail: String(customer.email).toLowerCase(),
      paystackSubscriptionCode: data.subscription_code,
      paystackCustomerCode: customer.customer_code,
      startDate: data.createdAt ? new Date(data.createdAt) : new Date(),
      nextPaymentDate: data.next_payment_date ? new Date(data.next_payment_date) : null,
    },
  });

  return {
    effects: [
      () =>
        sendSubscriptionThanks({
          subscriptionCode: subscription.paystackSubscriptionCode,
          subscriberName: subscription.subscriberName,
          subscriberEmail: subscription.subscriberEmail,
          tierName: tier.name,
          monthlyAmount: tier.monthlyAmount.toString(),
        }).catch((err) => console.error("Subscription email failed:", err)),
      // A first charge.success that arrived before this event was parked; process it now.
      () => retryParkedCharges(customer.customer_code),
    ],
  };
}

async function subscriptionCharge(data: Record<string, any>): Promise<DispatchResult> {
  const customerCode = data.customer?.customer_code;
  const subscription = customerCode
    ? await db.subscription.findFirst({
        where: { paystackCustomerCode: customerCode },
        orderBy: { createdAt: "desc" },
      })
    : null;
  if (!subscription) return { effects: [], parked: true, note: "waiting for subscription.create" };

  await db.subscriptionPayment.upsert({
    where: { paystackRef: data.reference },
    update: {},
    create: {
      subscriptionId: subscription.id,
      paystackRef: data.reference,
      amount: fromKobo(Number(data.amount)),
      status: data.status,
      paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
    },
  });
  return { effects: [] };
}

async function retryParkedCharges(customerCode: string | undefined): Promise<void> {
  if (!customerCode) return;
  const parked = await db.webhookEvent.findMany({
    where: { eventType: "charge.success", processed: false, note: "waiting for subscription.create" },
  });
  for (const ev of parked) {
    const payload = ev.payload as unknown as PaystackEvent;
    if (payload.data?.customer?.customer_code === customerCode) await handlePaystackEvent(payload);
  }
}

async function subscriptionUpdate(
  data: Record<string, any>,
  change: Prisma.SubscriptionUpdateInput,
): Promise<DispatchResult> {
  const code = data.subscription_code;
  if (!code) return { effects: [], note: "no subscription code" };
  const { count } = await db.subscription.updateMany({ where: { paystackSubscriptionCode: code }, data: change as any });
  return { effects: [], note: count ? undefined : "subscription not found" };
}

async function subscriptionDisable(data: Record<string, any>): Promise<DispatchResult> {
  const sub = await db.subscription.findUnique({ where: { paystackSubscriptionCode: data.subscription_code } });
  if (!sub) return { effects: [], note: "subscription not found" };
  // A subscription the partner chose not to renew has run its course; otherwise it was cancelled.
  await db.subscription.update({
    where: { id: sub.id },
    data: { status: sub.endsAtPeriodEnd ? "EXPIRED" : "CANCELLED" },
  });
  return { effects: [] };
}

async function alert(type: string, message: string, reference?: string) {
  console.error(`[alert:${type}] ${message}`);
  await db.systemAlert.create({ data: { type, message, reference } });
}
