"use client";

import { useCallback, useState, type MouseEvent } from "react";
import {
  fetchProformaPdfFile,
  exportProformaPdfFile,
  previewProformaPdf,
  PROFORMA_PDF_STATUS_LABEL,
  type ProformaPdfStatus,
} from "@/lib/proforma/downloadProformaPdf";

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
 * List/detail PDF controls (editor uses「保存并生成 PDF」instead).
 * Shares exactly one PDF File via Web Share — no text/url/title.
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ProformaPdfStatus>("idle");

  const setMsg = useCallback(
    (msg: string | null) => onMessage?.(msg),
    [onMessage]
  );
  const setErr = useCallback(
    (err: string | null) => onError?.(err),
    [onError]
  );

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

  async function handleDownloadPdf(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || disabled) return;

    setBusy(true);
    setErr(null);
    setStatus("generating");
    setMsg(PROFORMA_PDF_STATUS_LABEL.generating);

    try {
      const { file } = await fetchProformaPdfFile(invoiceId, invoiceNumber);
      const exported = await exportProformaPdfFile(file);
      setStatus(exported.method === "share" ? "shared" : "downloaded");
      setMsg(
        exported.method === "share"
          ? `PDF 已生成，请在系统菜单中选择「存储到文件」。\n${file.name}`
          : `${PROFORMA_PDF_STATUS_LABEL.downloaded}\n${file.name}`
      );
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
          ? PROFORMA_PDF_STATUS_LABEL.generating
          : "下载 PDF"}
      </button>
    </span>
  );
}
