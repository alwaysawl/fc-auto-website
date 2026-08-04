"use client";

import type { Locale, Vehicle } from "@/lib/types";
import { useCart } from "@/components/CartProvider";

type AddToCartButtonProps = {
  vehicle: Vehicle;
  addLabel: string;
  removeLabel: string;
  addToast: string;
  removeToast: string;
  /** Extra size/layout classes only — colors are controlled by cart state */
  className?: string;
  /** Locale for stacked mobile CTA labels (two lines). */
  locale?: Locale;
};

export default function AddToCartButton({
  vehicle,
  addLabel,
  removeLabel,
  addToast,
  removeToast,
  className = "",
  locale,
}: AddToCartButtonProps) {
  const { hasItem, addItem, removeItem, showToast, ready } = useCart();
  const inCart = ready && hasItem(vehicle.id);
  const mobileStacked = className.includes("vehicle-action-button");

  const stateClass = inCart
    ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
    : "bg-accent-yellow text-brand-slate border border-transparent hover:bg-accent-yellow-hover";

  const stackedLabel = (() => {
    if (!mobileStacked) return null;
    if (locale === "fr") {
      return inCart ? (
        <>
          Dans le
          <br />
          panier
        </>
      ) : (
        <>
          Ajouter au
          <br />
          panier
        </>
      );
    }
    if (locale === "en") {
      return inCart ? (
        <>
          In
          <br />
          cart
        </>
      ) : (
        <>
          Add to
          <br />
          cart
        </>
      );
    }
    // zh (default for mobile vehicle CTA)
    return inCart ? (
      <>
        已加入
        <br />
        购物车
      </>
    ) : (
      <>
        加入
        <br />
        购物车
      </>
    );
  })();

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
      className={
        mobileStacked
          ? className
          : `min-h-11 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${stateClass} ${className}`
      }
      aria-pressed={inCart}
    >
      <span className="vehicle-action-icon" aria-hidden="true">
        {inCart ? "🗑" : "🛒"}
      </span>
      {mobileStacked ? (
        <span className="vehicle-action-label vehicle-action-label-cart">
          {stackedLabel}
        </span>
      ) : (
        <span className="vehicle-action-label">
          {inCart ? removeLabel : addLabel}
        </span>
      )}
    </button>
  );
}
