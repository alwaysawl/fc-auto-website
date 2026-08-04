"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  fetchProformaPdfFile,
  previewProformaPdf,
  PROFORMA_PDF_STATUS_LABEL,
  type ProformaPdfStatus,
} from "@/lib/proforma/downloadProformaPdf";
import {
  canSharePdfFile,
  isAppleMobileBrowser,
  triggerAnchorDownload,
} from "@/lib/pdf/deliverPdfBlob";

const btnGhost =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-60";

type ProformaPdfActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  onMessage?: (message: string | null) => void;
  onError?: (error: string | null) => void;
};

/**
 * List/detail Proforma PDF controls.
 * Preview → new tab. Download → Blob/File + Web Share or <a download>.
 * iOS Download is two-stage (generate, then share on next tap).
 */
export default function ProformaPdfActions({
  invoiceId,
  invoiceNumber,
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
  const [generatedPdfFile, setGeneratedPdfFile] = useState<File | null>(null);
  const generatedPdfFileRef = useRef<File | null>(null);

  const setMsg = useCallback(
    (msg: string | null) => onMessage?.(msg),
    [onMessage]
  );
  const setErr = useCallback(
    (err: string | null) => onError?.(err),
    [onError]
  );

  useEffect(() => {
    generatedPdfFileRef.current = null;
    setGeneratedPdfFile(null);
    setStatus("idle");
    setBusy(false);
  }, [invoiceId, invoiceNumber]);

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

  async function handleShareReady(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const file = generatedPdfFileRef.current;
    if (!file || file.size === 0) {
      setErr("PDF 尚未生成");
      return;
    }
    if (!canSharePdfFile(file)) {
      setErr("请点「预览 PDF」，再在 Safari 中选择分享 → 存储到文件");
      return;
    }

    try {
      await navigator.share({ files: [file] });
      setStatus("shared");
      setMsg(`PDF generated successfully\n${file.name}`);
      setErr(null);
    } catch (error) {
      const err = error as { name?: string };
      if (err?.name === "AbortError") return;
      if (err?.name === "NotAllowedError") {
        setErr("请再次点击「下载 PDF」。");
        return;
      }
      console.error("[ProformaPdfActions] share", error);
      setErr("Download failed, please try again");
    }
  }

  async function handleDownloadPdf(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || disabled) return;

    // iOS stage 2: File ready → share as first await.
    if (
      apple &&
      generatedPdfFileRef.current &&
      generatedPdfFileRef.current.name.includes(invoiceNumber) &&
      canSharePdfFile(generatedPdfFileRef.current)
    ) {
      await handleShareReady(event);
      return;
    }

    setBusy(true);
    setErr(null);
    setStatus("generating");
    setMsg(PROFORMA_PDF_STATUS_LABEL.generating);

    try {
      const { file } = await fetchProformaPdfFile(invoiceId, invoiceNumber);
      generatedPdfFileRef.current = file;
      setGeneratedPdfFile(file);

      if (apple) {
        setStatus("ready");
        setMsg("PDF 已生成，请再次点击「下载 PDF」以保存到手机。");
        return;
      }

      if (canSharePdfFile(file)) {
        try {
          await navigator.share({ files: [file] });
          setStatus("shared");
          setMsg(`PDF generated successfully\n${file.name}`);
          return;
        } catch (error) {
          const err = error as { name?: string };
          if (err?.name === "AbortError") {
            setStatus("idle");
            setMsg(null);
            return;
          }
          // Fall through to anchor download on Android etc.
        }
      }

      triggerAnchorDownload(file, file.name);
      setStatus("downloaded");
      setMsg(`${PROFORMA_PDF_STATUS_LABEL.downloaded}\n${file.name}`);
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
      setErr(err?.message || "Download failed, please try again");
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
        onClick={(e) => void handleDownloadPdf(e)}
        className={pad}
      >
        {busy || status === "generating"
          ? "Generating PDF…"
          : "下载 PDF"}
      </button>
      {apple && generatedPdfFile ? (
        <span className="mt-1 w-full basis-full text-[11px] text-slate-600">
          PDF 已生成，请再次点击「下载 PDF」打开系统分享菜单。
        </span>
      ) : null}
    </span>
  );
}
