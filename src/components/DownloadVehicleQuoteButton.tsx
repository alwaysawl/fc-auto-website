"use client";

import { useState, type MouseEvent } from "react";
import type { Locale, Vehicle } from "@/lib/types";
import type { Translations } from "@/lib/translations";
import { useCart } from "@/components/CartProvider";
import {
  buildVehicleQuotePdfFile,
  downloadVehicleQuotePdf,
} from "@/lib/vehicleQuote/buildQuotePdf";
import {
  isAppleMobileBrowser,
  shareOrSavePdfFile,
} from "@/lib/pdf/deliverPdfBlob";
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
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const apple = isAppleMobileBrowser();

  async function handleGenerate(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (apple) {
        const { file, contactName } = await buildVehicleQuotePdfFile(
          vehicle,
          locale
        );
        setReadyFile(file);
        trackAnalyticsEvent("quote_download", {
          vehicleId: vehicle.id,
          locale,
          metadata: {
            assigned_contact_name: contactName.slice(0, 40),
            quote_type: "vehicle",
          },
          dedupeKey: `quote_download|${vehicle.id}|${Date.now()}`,
        });
        showToast("PDF 已生成，请点「分享或保存 PDF」");
      } else {
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
        showToast(
          result.deliveryMethod === "share"
            ? "已打开系统分享"
            : t.vehicleDetail.quoteDownloadSuccess
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        showToast("已取消分享");
        return;
      }
      console.error("[DownloadVehicleQuote]", err);
      showToast(t.vehicleDetail.quoteDownloadError);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!readyFile || busy) return;
    setBusy(true);
    try {
      const result = await shareOrSavePdfFile(readyFile);
      showToast(
        result.method === "share" ? "已打开系统分享" : t.vehicleDetail.quoteDownloadSuccess
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        showToast("已取消分享");
        return;
      }
      console.error("[DownloadVehicleQuote] share", err);
      showToast(t.vehicleDetail.quoteDownloadError);
    } finally {
      setBusy(false);
    }
  }

  if (apple) {
    return (
      <span className={`inline-flex flex-col gap-2 w-full ${className}`}>
        <button
          type="button"
          onClick={(e) => void handleGenerate(e)}
          disabled={busy}
          aria-busy={busy}
          className="inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
        >
          <span className="text-center leading-tight">
            {busy && !readyFile
              ? t.vehicleDetail.quotePreparing
              : "生成 PDF"}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => void handleShare(e)}
          disabled={busy || !readyFile}
          className="inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
        >
          <span className="text-center leading-tight">分享或保存 PDF</span>
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleGenerate(e)}
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
