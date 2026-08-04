"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Locale, Vehicle } from "@/lib/types";
import type { Translations } from "@/lib/translations";
import { useCart } from "@/components/CartProvider";
import { buildVehicleQuotePdfFile } from "@/lib/vehicleQuote/buildQuotePdf";
import {
  canSharePdfFile,
  isAppleMobileBrowser,
  openPdfFilePreview,
  supportsFileWebShare,
  triggerAnchorDownload,
} from "@/lib/pdf/deliverPdfBlob";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type DownloadVehicleQuoteButtonProps = {
  vehicle: Vehicle;
  locale: Locale;
  t: Translations;
  className?: string;
  /** Sticky/mobile slot: download only (two-stage on iOS). */
  compact?: boolean;
};

/**
 * Customer vehicle quotation PDF:
 * - Preview PDF → new tab (blob URL), does not navigate away
 * - Download PDF → Blob/File + Web Share (iOS) or <a download> (desktop/Android)
 *
 * On iOS, Download is two-stage so navigator.share keeps user activation.
 */
export default function DownloadVehicleQuoteButton({
  vehicle,
  locale,
  t,
  className = "",
  compact = false,
}: DownloadVehicleQuoteButtonProps) {
  const { showToast } = useCart();
  const [busy, setBusy] = useState(false);
  const [generatedPdfFile, setGeneratedPdfFile] = useState<File | null>(null);
  const generatedPdfFileRef = useRef<File | null>(null);
  const apple = isAppleMobileBrowser();
  const fileShareSupported = supportsFileWebShare();

  useEffect(() => {
    generatedPdfFileRef.current = null;
    setGeneratedPdfFile(null);
    setBusy(false);
  }, [vehicle.id]);

  function trackQuote(contactName: string) {
    trackAnalyticsEvent("quote_download", {
      vehicleId: vehicle.id,
      locale,
      metadata: {
        assigned_contact_name: contactName.slice(0, 40),
        quote_type: "vehicle",
      },
      dedupeKey: `quote_download|${vehicle.id}|${Date.now()}`,
    });
  }

  async function ensurePdfFile(): Promise<{ file: File; contactName: string }> {
    const existing = generatedPdfFileRef.current;
    if (existing && existing.size > 0 && existing.type === "application/pdf") {
      return { file: existing, contactName: "" };
    }
    const built = await buildVehicleQuotePdfFile(vehicle, locale);
    generatedPdfFileRef.current = built.file;
    setGeneratedPdfFile(built.file);
    return built;
  }

  async function handlePreview(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      showToast(t.vehicleDetail.quotePreparing);
      const { file, contactName } = await ensurePdfFile();
      if (contactName) trackQuote(contactName);
      openPdfFilePreview(file);
    } catch (err) {
      console.error("[DownloadVehicleQuote] preview", err);
      showToast(t.vehicleDetail.quoteDownloadError);
    } finally {
      setBusy(false);
    }
  }

  async function handleShareReadyFile(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const file = generatedPdfFileRef.current;
    if (!file || file.size === 0) {
      showToast(locale === "zh" ? "PDF 尚未生成" : "PDF is not ready yet");
      return;
    }

    if (!canSharePdfFile(file)) {
      showToast(
        locale === "zh"
          ? "请点「预览 PDF」，再在 Safari 中选择分享 → 存储到文件"
          : "Use Preview PDF, then Safari Share → Save to Files"
      );
      return;
    }

    try {
      await navigator.share({ files: [file] });
      showToast(
        locale === "zh" ? "PDF 已生成" : "PDF generated successfully"
      );
    } catch (error) {
      const err = error as { name?: string };
      if (err?.name === "AbortError") return;
      if (err?.name === "NotAllowedError") {
        showToast(
          locale === "zh"
            ? "请再次点击下载按钮以打开系统分享菜单"
            : "Please tap Download PDF again to open the share sheet"
        );
        return;
      }
      console.error("[DownloadVehicleQuote] share", error);
      showToast(t.vehicleDetail.quoteDownloadError);
    }
  }

  async function handleDownload(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    if (
      apple &&
      generatedPdfFileRef.current &&
      canSharePdfFile(generatedPdfFileRef.current)
    ) {
      await handleShareReadyFile(event);
      return;
    }

    setBusy(true);
    try {
      showToast(t.vehicleDetail.quotePreparing);
      const { file, contactName } = await buildVehicleQuotePdfFile(
        vehicle,
        locale
      );
      generatedPdfFileRef.current = file;
      setGeneratedPdfFile(file);
      if (contactName) trackQuote(contactName);

      console.info("[DownloadVehicleQuote] generated", {
        vehicleId: vehicle.id,
        name: file.name,
        type: file.type,
        size: file.size,
        share: typeof navigator.share === "function",
        canShareFiles: canSharePdfFile(file),
      });

      if (apple) {
        showToast(
          locale === "zh"
            ? "PDF 已生成，请再次点击下载以保存到手机"
            : "PDF generated successfully — tap Download again to save"
        );
        return;
      }

      if (fileShareSupported && canSharePdfFile(file)) {
        try {
          await navigator.share({ files: [file] });
          showToast(
            locale === "zh" ? "PDF 已生成" : "PDF generated successfully"
          );
          return;
        } catch (error) {
          const err = error as { name?: string };
          if (err?.name === "AbortError") return;
        }
      }

      triggerAnchorDownload(file, file.name);
      showToast(t.vehicleDetail.quoteDownloadSuccess);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("[DownloadVehicleQuote] download", err);
      showToast(t.vehicleDetail.quoteDownloadError);
    } finally {
      setBusy(false);
    }
  }

  const previewLabel = locale === "zh" ? "预览 PDF" : "Preview PDF";
  const downloadLabel = (() => {
    if (busy) {
      return locale === "zh"
        ? "生成中…"
        : locale === "fr"
          ? "Génération…"
          : "Generating…";
    }
    if (apple && generatedPdfFile) {
      return locale === "zh"
        ? "分享或保存 PDF"
        : locale === "fr"
          ? "Partager / Enregistrer"
          : "Share or Save PDF";
    }
    // Compact mobile CTA: short label. Desktop keeps the full product string.
    if (compact) {
      return locale === "zh"
        ? "生成 PDF"
        : locale === "fr"
          ? "Générer PDF"
          : "Generate PDF";
    }
    return t.vehicleDetail.downloadVehicleQuote;
  })();

  const btnBase =
    "inline-flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-wait";

  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => void handleDownload(e)}
        disabled={busy}
        aria-busy={busy}
        className={
          className.includes("vehicle-action-button")
            ? className
            : `${btnBase} w-full min-h-[58px] h-auto max-h-[64px] self-center px-2 py-2.5 rounded-xl text-[11px] font-semibold leading-tight text-center ${className}`
        }
      >
        <span className="vehicle-action-label">{downloadLabel}</span>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-2 w-full">
      <button
        type="button"
        onClick={(e) => void handlePreview(e)}
        disabled={busy}
        aria-busy={busy}
        className={`${btnBase} h-11 w-full px-4 border border-slate-300 bg-white text-brand-slate text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors`}
      >
        <span className="text-center leading-tight">{previewLabel}</span>
      </button>
      <button
        type="button"
        onClick={(e) => void handleDownload(e)}
        disabled={busy}
        aria-busy={busy}
        className={`${btnBase} ${className}`}
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
        <span className="text-center leading-tight">{downloadLabel}</span>
      </button>
    </span>
  );
}
