import type { OrderStatus } from "@/generated/prisma/enums";

// Browser-safe (no database imports).
export const STATUS_LABELS: Record<OrderStatus, string> = {
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In production",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};
export const STATUS_ORDER: OrderStatus[] = ["CONFIRMED", "IN_PRODUCTION", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
