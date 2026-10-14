"use client";

import { useCallback, useSyncExternalStore } from "react";
import { toKobo } from "@/lib/money";

// Guest cart in localStorage (PRD §5.7). It holds variant IDs, quantities and
// display data only; the server re-prices everything at checkout.

export type CartItem = {
  variantId: string;
  slug: string;
  productName: string;
  flavour: string;
  size: string;
  unitPrice: string; // naira, as shown when added
  image: string | null;
  quantity: number;
  // Wellness boxes: one delivered each day for this many days (absent = 1).
  days?: number;
};

export const MAX_DAYS = 365;
export const daysOf = (i: Pick<CartItem, "days">) => i.days ?? 1;
// A cart line is a variant bought for a number of days.
export const lineKey = (i: Pick<CartItem, "variantId" | "days">) => `${i.variantId}:${daysOf(i)}`;

const KEY = "yogurmac-cart-v1";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable (private mode): the cart still works for this page view.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((item: CartItem) => {
    const current = read();
    const key = lineKey(item);
    const existing = current.find((i) => lineKey(i) === key);
    write(
      existing
        ? current.map((i) => (lineKey(i) === key ? { ...item, quantity: Math.min(99, i.quantity + item.quantity) } : i))
        : [...current, item],
    );
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const q = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
    write(read().map((i) => (lineKey(i) === key ? { ...i, quantity: q } : i)));
  }, []);

  const remove = useCallback((key: string) => write(read().filter((i) => lineKey(i) !== key)), []);
  const clear = useCallback(() => write([]), []);

  // Apply server prices after a 409 price-drift response.
  const reprice = useCallback((prices: Record<string, string>) => {
    write(read().map((i) => (prices[i.variantId] ? { ...i, unitPrice: prices[i.variantId] } : i)));
  }, []);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotalKobo = items.reduce((n, i) => n + toKobo(i.unitPrice) * i.quantity * daysOf(i), 0);

  return { items, count, subtotalKobo, add, setQuantity, remove, clear, reprice };
}
