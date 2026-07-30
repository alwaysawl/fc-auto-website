"use client";

import type { Vehicle } from "@/lib/types";
import { useCart } from "@/components/CartProvider";

type AddToCartButtonProps = {
  vehicle: Vehicle;
  addLabel: string;
  addedLabel: string;
  toastLabel: string;
  className?: string;
};

export default function AddToCartButton({
  vehicle,
  addLabel,
  addedLabel,
  toastLabel,
  className = "",
}: AddToCartButtonProps) {
  const { hasItem, addItem, ready } = useCart();
  const inCart = ready && hasItem(vehicle.id);

  return (
    <button
      type="button"
      disabled={!ready || inCart}
      onClick={() => {
        if (inCart) return;
        addItem(vehicle, toastLabel);
      }}
      className={
        className ||
        "min-h-11 inline-flex items-center justify-center px-3 rounded-lg text-sm font-semibold transition-colors disabled:cursor-default"
      }
      aria-pressed={inCart}
    >
      {inCart ? addedLabel : addLabel}
    </button>
  );
}
