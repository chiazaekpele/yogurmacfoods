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

// Pickup orders skip "Out for delivery" and use pickup wording.
export const stepsFor = (fulfilment: "DELIVERY" | "PICKUP") => (fulfilment === "PICKUP" ? STATUS_ORDER.filter((s) => s !== "OUT_FOR_DELIVERY") : STATUS_ORDER);
export function statusLabel(s: OrderStatus, fulfilment: "DELIVERY" | "PICKUP"): string {
  if (fulfilment === "PICKUP" && s === "READY") return "Ready for pickup";
  if (fulfilment === "PICKUP" && s === "DELIVERED") return "Collected";
  return STATUS_LABELS[s];
}
