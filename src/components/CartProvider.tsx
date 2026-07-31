"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Vehicle } from "@/lib/types";
import type { VehicleTypeId } from "@/data/shippingRates";
import {
  type CartItem,
  type CartShippingSelection,
  readCartFromStorage,
  writeCartToStorage,
  readCartShippingFromStorage,
  writeCartShippingToStorage,
  vehicleToCartItem,
} from "@/lib/cart";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type CartContextValue = {
  ready: boolean;
  items: CartItem[];
  count: number;
  shipping: CartShippingSelection;
  toast: string | null;
  addItem: (vehicle: Vehicle, toastMessage?: string) => boolean;
  removeItem: (id: string) => void;
  hasItem: (id: string) => boolean;
  clearCart: () => void;
  setShipping: (next: Partial<CartShippingSelection>) => void;
  setItemVehicleType: (id: string, vehicleTypeId: VehicleTypeId) => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [shipping, setShippingState] = useState<CartShippingSelection>({
    countryId: "",
    portId: "",
    method: "container",
    arrangement: "fc_auto",
  });
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(readCartFromStorage());
    setShippingState(readCartShippingFromStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeCartToStorage(items);
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    writeCartShippingToStorage(shipping);
  }, [shipping, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string) => {
    // Single global toast: replace any previous message immediately
    setToast(message);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const addItem = useCallback(
    (vehicle: Vehicle, toastMessage?: string) => {
      let added = false;
      setItems((prev) => {
        if (prev.some((item) => item.id === vehicle.id)) return prev;
        added = true;
        return [...prev, vehicleToCartItem(vehicle)];
      });
      if (added) {
        trackAnalyticsEvent("cart_add", {
          vehicleId: vehicle.id,
          cartItemCount: items.length + 1,
          cartValueUsd: undefined,
          metadata: { brand: vehicle.brand?.slice(0, 40) },
          dedupeKey: `cart_add|${vehicle.id}|${Date.now()}`,
        });
        if (toastMessage) showToast(toastMessage);
      }
      return added;
    },
    [showToast, items.length]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length !== prev.length) {
        trackAnalyticsEvent("cart_remove", {
          vehicleId: id,
          cartItemCount: next.length,
          dedupeKey: `cart_remove|${id}|${Date.now()}`,
        });
      }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems((prev) => {
      if (prev.length > 0) {
        trackAnalyticsEvent("cart_clear", {
          cartItemCount: 0,
          dedupeKey: `cart_clear|${Date.now()}`,
        });
      }
      return [];
    });
  }, []);

  const hasItem = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items]
  );

  const setShipping = useCallback((next: Partial<CartShippingSelection>) => {
    setShippingState((prev) => {
      const merged = { ...prev, ...next };
      if (next.countryId !== undefined && next.countryId !== prev.countryId) {
        merged.portId = "";
      }
      return merged;
    });
  }, []);

  const setItemVehicleType = useCallback(
    (id: string, vehicleTypeId: VehicleTypeId) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, vehicleTypeId } : item
        )
      );
    },
    []
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ready,
      items,
      count: items.length,
      shipping,
      toast,
      addItem,
      removeItem,
      hasItem,
      clearCart,
      setShipping,
      setItemVehicleType,
      showToast,
      dismissToast,
    }),
    [
      ready,
      items,
      shipping,
      toast,
      addItem,
      removeItem,
      hasItem,
      clearCart,
      setShipping,
      setItemVehicleType,
      showToast,
      dismissToast,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
