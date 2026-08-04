"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Locale, Vehicle } from "@/lib/types";
import type { Translations } from "@/lib/translations";
import { useCart } from "@/components/CartProvider";
import {
  buildVehicleQuotePdfFile,
  downloadVehicleQuotePdf,
} from "@/lib/vehicleQuote/buildQuotePdf";
import { isAppleMobileBrowser } from "@/lib/pdf/deliverPdfBlob";
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
  const [generatedPdfFile, setGeneratedPdfFile] = useState<File | null>(null);
  const [generatedVehicleId, setGeneratedVehicleId] = useState<string | null>(
    null
  );
  const [outdated, setOutdated] = useState(false);
  const generatedPdfFileRef = useRef<File | null>(null);
  const apple = isAppleMobileBrowser();

  useEffect(() => {
    generatedPdfFileRef.current = null;
    setGeneratedPdfFile(null);
    setGeneratedVehicleId(null);
    setOutdated(false);
    setBusy(false);
  }, [vehicle.id]);

  async function handleGenerate(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    generatedPdfFileRef.current = null;
    setGeneratedPdfFile(null);
    setGeneratedVehicleId(null);
    setOutdated(false);
    try {
      if (apple) {
        const { file, contactName } = await buildVehicleQuotePdfFile(
          vehicle,
          locale
        );
        generatedPdfFileRef.current = file;
        setGeneratedPdfFile(file);
        setGeneratedVehicleId(vehicle.id);
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
            ? "系统分享已完成"
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

  /** STRICT: navigator.share as first await — no setState before share. */
  async function handleShareOrSavePdf(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const file = generatedPdfFileRef.current;

    if (!file || file.size === 0) {
      window.alert("请先生成 PDF");
      return;
    }

    if (generatedVehicleId !== vehicle.id) {
      generatedPdfFileRef.current = null;
      setGeneratedPdfFile(null);
      setOutdated(true);
      window.alert("报价内容已更改，请重新生成 PDF");
      return;
    }

    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };

    if (
      typeof navigator.share !== "function" ||
      typeof nav.canShare !== "function" ||
      !nav.canShare({ files: [file] })
    ) {
      window.alert("当前浏览器不支持直接分享 PDF，请使用 Safari 打开。");
      return;
    }

    try {
      await navigator.share({
        files: [file],
      });
      showToast(`系统分享已完成\n${file.name}`);
    } catch (error) {
      const err = error as { name?: string };
      if (err?.name === "AbortError") {
        showToast("已取消分享");
        return;
      }
      console.error("[DownloadVehicleQuote] navigator.share failed", error);
      window.alert("系统分享菜单打开失败");
    }
  }

  const shareEnabled =
    !!generatedPdfFile &&
    !busy &&
    !outdated &&
    generatedVehicleId === vehicle.id;

  const canShareNow = (() => {
    if (!generatedPdfFile || typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (typeof navigator.share !== "function") return false;
    if (typeof nav.canShare !== "function") return false;
    try {
      return nav.canShare({ files: [generatedPdfFile] });
    } catch {
      return false;
    }
  })();

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
            {busy && !generatedPdfFile
              ? t.vehicleDetail.quotePreparing
              : "生成 PDF"}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => void handleShareOrSavePdf(e)}
          disabled={!shareEnabled}
          className="inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
        >
          <span className="text-center leading-tight">分享或保存 PDF</span>
        </button>
        {outdated ? (
          <span className="text-xs text-amber-700">
            报价内容已更改，请重新生成 PDF
          </span>
        ) : null}
        <span className="rounded border border-dashed border-amber-300 bg-amber-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-amber-950">
          [PDF debug]
          <br />
          file.name: {generatedPdfFile?.name ?? "(null)"}
          <br />
          file.type: {generatedPdfFile?.type ?? "(null)"}
          <br />
          file.size: {generatedPdfFile?.size ?? "(null)"}
          <br />
          navigator.share:{" "}
          {typeof navigator !== "undefined" &&
          typeof navigator.share === "function"
            ? "yes"
            : "no"}
          <br />
          canShare(files): {String(canShareNow)}
        </span>
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
