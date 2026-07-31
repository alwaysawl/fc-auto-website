"use client";

import { useState } from "react";
import type { Locale, Vehicle } from "@/lib/types";
import type { Translations } from "@/lib/translations";
import { useCart } from "@/components/CartProvider";
import { downloadVehicleQuotePdf } from "@/lib/vehicleQuote/buildQuotePdf";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type DownloadVehicleQuoteButtonProps = {
  vehicle: Vehicle;
  locale: Locale;
  t: Translations;
  className?: string;
};

export default function DownloadVehicleQuoteButton({
  vehicle,
  locale,
  t,
  className = "",
}: DownloadVehicleQuoteButtonProps) {
  const { showToast } = useCart();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await downloadVehicleQuotePdf(vehicle, locale);
      trackAnalyticsEvent("quote_download", {
        vehicleId: vehicle.id,
        locale,
        metadata: {
          assigned_contact_name: result.contactName.slice(0, 40),
          quote_type: "vehicle",
        },
        dedupeKey: `quote_download|${vehicle.id}|${Date.now()}`,
      });
      showToast(t.vehicleDetail.quoteDownloadSuccess);
    } catch (err) {
      console.error("[DownloadVehicleQuote]", err);
      showToast(t.vehicleDetail.quoteDownloadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait ${className}`}
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="text-center leading-tight">
        {busy
          ? t.vehicleDetail.quotePreparing
          : t.vehicleDetail.downloadVehicleQuote}
      </span>
    </button>
  );
}
