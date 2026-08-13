"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { Locale, Vehicle } from "@/lib/types";
import type { Translations } from "@/lib/translations";
import { useCart } from "@/components/CartProvider";
import { buildVehicleQuotePdfFile } from "@/lib/vehicleQuote/buildQuotePdf";
import {
  canSharePdfFile,
  isAppleMobileBrowser,
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
 * - Preview PDF → in-page overlay (no window.open after await)
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const generatedPdfFileRef = useRef<File | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewRequestIdRef = useRef(0);
  const apple = isAppleMobileBrowser();
  const fileShareSupported = supportsFileWebShare();

  useEffect(() => {
    generatedPdfFileRef.current = null;
    setGeneratedPdfFile(null);
    setBusy(false);
    previewRequestIdRef.current += 1;
    setPreviewOpen(false);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, [vehicle.id]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreviewOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewOpen]);

  function revokePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }

  function closePreviewOverlay() {
    previewRequestIdRef.current += 1;
    setPreviewOpen(false);
    revokePreviewUrl();
    setBusy(false);
  }

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
    if (!built.file || built.file.size === 0) {
      throw new Error("PDF file was empty");
    }
    generatedPdfFileRef.current = built.file;
    setGeneratedPdfFile(built.file);
    return built;
  }

  async function handlePreview(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    const requestId = ++previewRequestIdRef.current;
    setBusy(true);
    setPreviewOpen(true);
    revokePreviewUrl();

    try {
      const { file, contactName } = await ensurePdfFile();
      if (requestId !== previewRequestIdRef.current) return;
      if (contactName) trackQuote(contactName);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      if (requestId !== previewRequestIdRef.current) return;
      console.error("[DownloadVehicleQuote] preview", err);
      setPreviewOpen(false);
      revokePreviewUrl();
      showToast(t.vehicleDetail.quoteDownloadError);
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setBusy(false);
      }
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

  const previewLabel = busy
    ? t.vehicleDetail.quotePreparing
    : locale === "zh"
      ? "预览 PDF"
      : locale === "fr"
        ? "Aperçu PDF"
        : "Preview PDF";

  const compactPdfLabel = (() => {
    if (busy) {
      return locale === "zh"
        ? "正在生成…"
        : locale === "fr"
          ? "Génération…"
          : "Generating…";
    }
    if (apple && generatedPdfFile) {
      return locale === "zh" ? (
        <>
          分享或保存
          <br />
          PDF
        </>
      ) : locale === "fr" ? (
        <>
          Partager /
          <br />
          Enregistrer
        </>
      ) : (
        <>
          Share or
          <br />
          Save PDF
        </>
      );
    }
    return locale === "zh" ? (
      <>
        一键生成车辆
        <br />
        报价单 PDF
      </>
    ) : locale === "fr" ? (
      <>
        Devis véhicule
        <br />
        PDF
      </>
    ) : (
      <>
        Generate vehicle
        <br />
        quote PDF
      </>
    );
  })();

  const downloadLabel = (() => {
    if (busy) return t.vehicleDetail.quotePreparing;
    if (apple && generatedPdfFile) {
      return locale === "zh" ? "分享或保存 PDF" : "Share or Save PDF";
    }
    return t.vehicleDetail.downloadVehicleQuote;
  })();

  const btnBase =
    "inline-flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-wait";

  const previewOverlay =
    previewOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[400] flex flex-col bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-label={t.vehicleDetail.closePdfPreview}
          >
            <div className="flex-shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 bg-[#1E293B] text-white shadow-md">
              <button
                type="button"
                onClick={closePreviewOverlay}
                className="min-h-11 px-4 sm:px-5 rounded-lg bg-accent-yellow text-brand-slate text-sm sm:text-base font-bold hover:bg-accent-yellow-hover transition-colors"
              >
                {t.vehicleDetail.closePdfPreview}
              </button>
              <p className="text-xs sm:text-sm text-white/80 truncate pr-1">
                {busy && !previewUrl ? t.vehicleDetail.quotePreparing : ""}
              </p>
            </div>
            <div className="flex-1 min-h-0 bg-slate-200">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  title="PDF preview"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-brand-slate text-sm font-semibold">
                  {t.vehicleDetail.quotePreparing}
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => void handleDownload(e)}
          disabled={busy}
          aria-busy={busy}
          className={
            className.includes("vehicle-action-button")
              ? className
              : `${btnBase} w-full h-[72px] px-2 rounded-xl text-sm font-bold leading-tight text-center ${className}`
          }
        >
          <span className="vehicle-action-label vehicle-action-label-pdf">
            {compactPdfLabel}
          </span>
        </button>
        {previewOverlay}
      </>
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
      {previewOverlay}
    </span>
  );
}
