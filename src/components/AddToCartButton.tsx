"use client";

import type { Vehicle } from "@/lib/types";
import { useCart } from "@/components/CartProvider";

type AddToCartButtonProps = {
  vehicle: Vehicle;
  addLabel: string;
  removeLabel: string;
  addToast: string;
  removeToast: string;
  /** Extra size/layout classes only — colors are controlled by cart state */
  className?: string;
};

export default function AddToCartButton({
  vehicle,
  addLabel,
  removeLabel,
  addToast,
  removeToast,
  className = "",
}: AddToCartButtonProps) {
  const { hasItem, addItem, removeItem, showToast, ready } = useCart();
  const inCart = ready && hasItem(vehicle.id);

  const stateClass = inCart
    ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
    : "bg-accent-yellow text-brand-slate border border-transparent hover:bg-accent-yellow-hover";

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => {
        if (!ready) return;
        if (inCart) {
          removeItem(vehicle.id);
          showToast(removeToast);
          return;
        }
        addItem(vehicle, addToast);
      }}
      className={`min-h-11 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${stateClass} ${className}`}
      aria-pressed={inCart}
    >
      <span aria-hidden>{inCart ? "🗑" : "🛒"}</span>
      <span className="break-words text-center leading-tight">
        {inCart ? removeLabel : addLabel}
      </span>
    </button>
  );
}
