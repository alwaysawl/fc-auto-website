"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale, Vehicle } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { useCart } from "@/components/CartProvider";

type CheckoutNowButtonProps = {
  vehicle: Vehicle;
  locale: Locale;
  label: string;
  className?: string;
};

/**
 * Vehicle-detail “立即结算”: ensure vehicle is in cart (once), then open the
 * existing localized cart/checkout page. Does not open WhatsApp.
 */
export default function CheckoutNowButton({
  vehicle,
  locale,
  label,
  className = "",
}: CheckoutNowButtonProps) {
  const router = useRouter();
  const { ready, hasItem, addItem } = useCart();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={!ready || busy}
      onClick={() => {
        if (!ready || busy) return;
        setBusy(true);
        try {
          if (!hasItem(vehicle.id)) {
            addItem(vehicle);
          }
          router.push(getLocalizedPath("/cart", locale));
        } finally {
          setBusy(false);
        }
      }}
      className={
        className.includes("vehicle-action-button")
          ? className
          : `min-h-11 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-white font-semibold hover:bg-[#20BD5A] transition-colors disabled:opacity-60 ${className}`
      }
    >
      <span className="vehicle-action-label">{label}</span>
    </button>
  );
}
