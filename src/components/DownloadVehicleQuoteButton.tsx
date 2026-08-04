"use client";

import { useEffect, useState, type MouseEvent } from "react";
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

type ReadyQuote = {
  file: File;
  vehicleId: string;
  generatedAt: number;
};

export default function DownloadVehicleQuoteButton({
  vehicle,
  locale,
  t,
  className = "",
}: DownloadVehicleQuoteButtonProps) {
  const { showToast } = useCart();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<ReadyQuote | null>(null);
  const [outdated, setOutdated] = useState(false);
  const apple = isAppleMobileBrowser();

  // New vehicle → wipe previous File completely.
  useEffect(() => {
    setReady(null);
    setOutdated(false);
    setBusy(false);
  }, [vehicle.id]);

  async function handleGenerate(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setReady(null);
    setOutdated(false);
    try {
      if (apple) {
        const { file, contactName } = await buildVehicleQuotePdfFile(
          vehicle,
          locale
        );
        console.info("[DownloadVehicleQuote] generated", {
          vehicleId: vehicle.id,
          filename: file.name,
          size: file.size,
          generatedAt: file.lastModified,
        });
        setReady({
          file,
          vehicleId: vehicle.id,
          generatedAt: file.lastModified,
        });
        trackAnalyticsEvent("quote_download", {
          vehicleId: vehicle.id,
          locale,
          metadata: {
            assigned_contact_name: contactName.slice(0, 40),
            quote_type: "vehicle",
          },
          dedupeKey: `quote_download|${vehicle.id}|${Date.now()}`,
        });
        showToast(`已生成：${file.name}，请点「分享或保存 PDF」`);
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
    if (!ready || busy || outdated) return;
    if (ready.vehicleId !== vehicle.id) {
      setReady(null);
      setOutdated(true);
      showToast("报价内容已更改，请重新生成 PDF");
      return;
    }
    setBusy(true);
    try {
      console.info("[DownloadVehicleQuote] share", {
        vehicleId: vehicle.id,
        filename: ready.file.name,
        size: ready.file.size,
      });
      const result = await shareOrSavePdfFile(ready.file);
      showToast(
        result.method === "share"
          ? "已打开系统分享"
          : t.vehicleDetail.quoteDownloadSuccess
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

  const shareEnabled =
    !!ready &&
    !busy &&
    !outdated &&
    ready.vehicleId === vehicle.id;

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
            {busy && !ready ? t.vehicleDetail.quotePreparing : "生成 PDF"}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => void handleShare(e)}
          disabled={!shareEnabled}
          className="inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
        >
          <span className="text-center leading-tight">分享或保存 PDF</span>
        </button>
        {ready ? (
          <span className="text-xs text-slate-500 break-all">
            已生成：{ready.file.name}
          </span>
        ) : null}
        {outdated ? (
          <span className="text-xs text-amber-700">
            报价内容已更改，请重新生成 PDF
          </span>
        ) : null}
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
