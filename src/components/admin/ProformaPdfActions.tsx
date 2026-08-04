"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  fetchProformaPdfFile,
  isAppleMobileBrowser,
  previewProformaPdf,
  downloadProformaPdf,
  PROFORMA_PDF_STATUS_LABEL,
  type ProformaPdfStatus,
  type FetchedProformaPdf,
} from "@/lib/proforma/downloadProformaPdf";

const btnGhost =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-60";

type ProformaPdfActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  /** Kept for call-site compatibility; unused — download always fetches fresh. */
  contentSignature?: string;
  seedReady?: FetchedProformaPdf | null;
  onSeedConsumed?: () => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  onMessage?: (message: string | null) => void;
  onError?: (error: string | null) => void;
};

/**
 * Proforma PDF controls.
 *
 * iPhone Safari「下载 PDF」:
 *   fetch current invoice PDF → File → navigator.share({ files })
 *   → iOS system share sheet → user picks「存储到文件」→ Save page → 存储
 *
 * Never opens Files Recents, never uses <a download>, never navigates.
 * Preview is a separate button only.
 */
export default function ProformaPdfActions({
  invoiceId,
  invoiceNumber,
  seedReady = null,
  onSeedConsumed,
  disabled = false,
  className = "",
  buttonClassName = btnGhost,
  compact = false,
  onMessage,
  onError,
}: ProformaPdfActionsProps) {
  const apple = isAppleMobileBrowser();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ProformaPdfStatus>("idle");
  const [lastFilename, setLastFilename] = useState<string | null>(null);

  const setMsg = useCallback(
    (msg: string | null) => onMessage?.(msg),
    [onMessage]
  );
  const setErr = useCallback(
    (err: string | null) => onError?.(err),
    [onError]
  );

  // Discard parent seed — download always fetches a fresh File on tap.
  useEffect(() => {
    if (seedReady) onSeedConsumed?.();
  }, [seedReady, onSeedConsumed]);

  const handlePreview = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setErr(null);
    try {
      previewProformaPdf(invoiceId, event);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "预览失败");
    }
  };

  /**
   * iPhone: fetch PDF Blob → File → navigator.share (system share sheet).
   * No <a download>, no window.open, no Files navigation, no success-before-save.
   */
  async function handleDownloadPdf(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || disabled) return;

    const currentInvoiceNumber = invoiceNumber.trim();
    const currentInvoiceId = invoiceId.trim();
    if (!currentInvoiceId || !currentInvoiceNumber) {
      window.alert("缺少发票信息，无法下载 PDF");
      return;
    }

    setBusy(true);
    setErr(null);
    setStatus("generating");
    setLastFilename(null);
    setMsg(PROFORMA_PDF_STATUS_LABEL.generating);

    try {
      const { file } = await fetchProformaPdfFile(
        currentInvoiceId,
        currentInvoiceNumber
      );

      if (!file.size || file.type !== "application/pdf") {
        throw new Error("PDF generation failed");
      }
      if (!file.name.includes(currentInvoiceNumber)) {
        throw new Error(
          `文件名与当前发票不一致：${file.name} / ${currentInvoiceNumber}`
        );
      }

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (
        typeof navigator.share !== "function" ||
        typeof nav.canShare !== "function" ||
        !nav.canShare({ files: [file] })
      ) {
        throw new Error("This browser cannot save PDF files");
      }

      // Open iOS system share sheet only — never fall back to Files / preview / <a>.
      await navigator.share({
        files: [file],
        title: file.name,
      });

      // Share sheet finished (user shared/saved or iOS closed it).
      // Never claim「保存成功」— only show the allowed guidance + filename.
      setLastFilename(file.name);
      setStatus("shared");
      setMsg(`PDF 已生成，请在系统菜单中选择「存储到文件」\n${file.name}`);
    } catch (error) {
      const err = error as { name?: string; message?: string };
      if (err?.name === "AbortError") {
        setStatus("idle");
        setMsg(null);
        return;
      }
      console.error("[ProformaPdfActions] handleDownloadPdf", error);
      setStatus("error");
      setMsg(null);
      setErr(err?.message || "PDF 保存失败，请重试");
      window.alert("PDF 保存失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  /** Desktop / Android: fetch then download (non-Apple path). */
  async function handleDesktopDownload(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || disabled) return;

    setBusy(true);
    setErr(null);
    setStatus("generating");
    setMsg(PROFORMA_PDF_STATUS_LABEL.generating);

    try {
      const result = await downloadProformaPdf(invoiceId, {
        invoiceNumber,
        onStatus: (s, detail) => {
          setStatus(s);
          setMsg(detail || PROFORMA_PDF_STATUS_LABEL[s]);
        },
      });
      setLastFilename(result.filename);
      setMsg(
        result.status === "downloaded" || result.status === "shared"
          ? `${result.message}\n${result.filename}`
          : result.message
      );
      setStatus(result.status);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMsg(null);
      } else {
        setStatus("error");
        const message =
          err instanceof Error ? err.message : PROFORMA_PDF_STATUS_LABEL.error;
        setErr(message);
        setMsg(null);
        window.alert("PDF 保存失败，请重试");
      }
    } finally {
      setBusy(false);
    }
  }

  const pad = compact
    ? "rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-50"
    : buttonClassName;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={handlePreview}
        className={pad}
      >
        预览 PDF
      </button>

      <button
        type="button"
        disabled={busy || disabled}
        onClick={(e) =>
          void (apple ? handleDownloadPdf(e) : handleDesktopDownload(e))
        }
        className={pad}
      >
        {busy ? PROFORMA_PDF_STATUS_LABEL.generating : "下载 PDF"}
      </button>

      {apple ? (
        <span className="mt-1 w-full basis-full text-[11px] leading-snug text-slate-600 break-all">
          点击「下载 PDF」后将打开系统分享菜单，请选择「存储到文件」，再点右上角「存储」。
          {lastFilename ? (
            <>
              <br />
              {lastFilename}
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
