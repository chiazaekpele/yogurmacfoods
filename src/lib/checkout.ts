import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { fromKobo, toKobo } from "./money";
import { generateOrderId } from "./order-id";
import { getShippingRates } from "./shipping";
import type { CheckoutInput } from "./validation";

const PENDING_CHECKOUT_TTL_MS = 48 * 60 * 60 * 1000;

export type PricedLine = {
  variantId: string;
  quantity: number;
  days: number;
  unitPrice: string;
  productName: string;
  flavour: string;
  size: string;
};

export type Quote = { lines: PricedLine[]; subtotalKobo: number; shippingKobo: number; totalKobo: number; deliveryDays: number };

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: string,
  ) {
    super(message);
  }
}

// Prices always come from the database, never from the client (TRD §6.1).
export async function quote(input: Pick<CheckoutInput, "items" | "lga">): Promise<Quote> {
  // One line per variant and number of days.
  const wanted = new Map<string, { variantId: string; days: number; quantity: number }>();
  for (const i of input.items) {
    const days = i.days ?? 1;
    const key = `${i.variantId}:${days}`;
    const line = wanted.get(key) ?? { variantId: i.variantId, days, quantity: 0 };
    line.quantity += i.quantity;
    wanted.set(key, line);
  }

  const variants = await db.productVariant.findMany({
    where: { id: { in: [...new Set([...wanted.values()].map((w) => w.variantId))] } },
    include: { product: { include: { category: { select: { isBox: true } } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: PricedLine[] = [];
  for (const { variantId, days, quantity } of wanted.values()) {
    const v = byId.get(variantId);
    if (!v || !v.isAvailable || !v.product.isActive) {
      const label = v ? `${v.product.name} (${v.flavour}, ${v.size})` : "An item in your cart";
      throw new CheckoutError(`${label} is no longer available. Please remove it from your cart.`, 422, "items");
    }
    if (quantity > 99) throw new CheckoutError("Maximum quantity per item is 99.", 422, "items");
    if (days > 1 && !v.product.category.isBox) {
      throw new CheckoutError(`${v.product.name} can’t be ordered for several days.`, 422, "items");
    }
    lines.push({
      variantId,
      quantity,
      days,
      unitPrice: v.price.toString(),
      productName: v.product.name,
      flavour: v.flavour,
      size: v.size,
    });
  }

  const rates = await getShippingRates();
  const fee = rates[input.lga];
  if (fee === null || fee === undefined) {
    throw new CheckoutError(`Delivery to ${input.lga} is not available yet. Please contact us.`, 422, "lga");
  }

  const subtotalKobo = lines.reduce((sum, l) => sum + toKobo(l.unitPrice) * l.quantity * l.days, 0);
  // A daily box means a delivery every day: the LGA fee is charged once per
  // delivery day; everything else in the order travels with those deliveries.
  const deliveryDays = Math.max(1, ...lines.map((l) => l.days));
  const shippingKobo = toKobo(fee) * deliveryDays;
  return { lines, subtotalKobo, shippingKobo, totalKobo: subtotalKobo + shippingKobo, deliveryDays };
}

export async function createPendingCheckout(input: CheckoutInput, q: Quote, customerId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderId = generateOrderId();
    try {
      return await db.pendingCheckout.create({
        data: {
          orderId,
          customerId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          lga: input.lga,
          exactAddress: input.exactAddress,
          landmark: input.landmark ?? null,
          items: q.lines as unknown as Prisma.InputJsonValue,
          subtotal: fromKobo(q.subtotalKobo),
          shippingFee: fromKobo(q.shippingKobo),
          total: fromKobo(q.totalKobo),
          expiresAt: new Date(Date.now() + PENDING_CHECKOUT_TTL_MS),
        },
      });
    } catch (err) {
      // Order ID collision: try a fresh ID.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw new Error("Could not allocate a unique order ID");
}
