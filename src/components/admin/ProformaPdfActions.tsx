"use client";

import { useCallback, useState, type MouseEvent } from "react";
import {
  fetchProformaPdfFile,
  isAppleMobileBrowser,
  previewProformaPdf,
  shareOrSaveProformaPdfFile,
  downloadProformaPdf,
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
 * Production Proforma PDF controls.
 *
 * iPhone/iPad (two-step, required for Web Share user-activation):
 *   1) 生成 PDF  → fetch Blob into memory (no navigation)
 *   2) 分享或保存 PDF → navigator.share() on this direct tap
 *
 * Desktop/Android:
 *   下载 PDF → fetch + <a download>
 *
 * 预览 PDF is separate and may open the Safari viewer.
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
  const [readyFile, setReadyFile] = useState<File | null>(null);

  const setMsg = useCallback(
    (msg: string | null) => {
      onMessage?.(msg);
    },
    [onMessage]
  );
  const setErr = useCallback(
    (err: string | null) => {
      onError?.(err);
    },
    [onError]
  );

  const handlePreview = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    console.info("[ProformaPdfActions] preview click", {
      file: "ProformaPdfActions.tsx",
      invoiceId,
    });
    setErr(null);
    try {
      previewProformaPdf(invoiceId, event);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "预览失败");
    }
  };

  /** Step 1 (Apple) or one-shot download (desktop). */
  const handleGenerateOrDownload = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy || disabled) return;

    console.info("[ProformaPdfActions] generate/download click", {
      file: "ProformaPdfActions.tsx",
      apple,
      invoiceId,
      preventDefault: true,
    });

    setBusy(true);
    setErr(null);
    setStatus("generating");
    setMsg(PROFORMA_PDF_STATUS_LABEL.generating);

    try {
      if (apple) {
        const file = await fetchProformaPdfFile(invoiceId, invoiceNumber);
        setReadyFile(file);
        setStatus("ready");
        setMsg(PROFORMA_PDF_STATUS_LABEL.ready);
      } else {
        const result = await downloadProformaPdf(invoiceId, {
          invoiceNumber,
          onStatus: (s, detail) => {
            setStatus(s);
            setMsg(detail || PROFORMA_PDF_STATUS_LABEL[s]);
          },
        });
        setMsg(result.message);
        setStatus(result.status);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMsg("已取消分享");
      } else {
        setStatus("error");
        const message =
          err instanceof Error ? err.message : PROFORMA_PDF_STATUS_LABEL.error;
        setErr(message);
        setMsg(null);
      }
    } finally {
      setBusy(false);
    }
  };

  /** Step 2 (Apple only): share from a fresh user gesture — no network first. */
  const handleShareOrSave = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!readyFile || busy) return;

    console.info("[ProformaPdfActions] share click (direct gesture)", {
      file: "ProformaPdfActions.tsx",
      filename: readyFile.name,
      size: readyFile.size,
      preventDefault: true,
    });

    setBusy(true);
    setStatus("sharing");
    setMsg(PROFORMA_PDF_STATUS_LABEL.sharing);
    setErr(null);

    try {
      const result = await shareOrSaveProformaPdfFile(readyFile);
      setStatus(result.method === "share" ? "shared" : "downloaded");
      setMsg(result.message);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMsg("已取消分享");
      } else {
        setStatus("error");
        const message =
          err instanceof Error ? err.message : PROFORMA_PDF_STATUS_LABEL.error;
        setErr(message);
        setMsg(null);
      }
    } finally {
      setBusy(false);
    }
  };

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

      {apple ? (
        <>
          <button
            type="button"
            disabled={busy || disabled}
            onClick={(e) => void handleGenerateOrDownload(e)}
            className={pad}
          >
            {busy && status === "generating"
              ? PROFORMA_PDF_STATUS_LABEL.generating
              : "生成 PDF"}
          </button>
          <button
            type="button"
            disabled={busy || disabled || !readyFile}
            onClick={(e) => void handleShareOrSave(e)}
            className={pad}
          >
            {busy && status === "sharing"
              ? PROFORMA_PDF_STATUS_LABEL.sharing
              : "分享或保存 PDF"}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={(e) => void handleGenerateOrDownload(e)}
          className={pad}
        >
          {busy
            ? PROFORMA_PDF_STATUS_LABEL[status] ||
              PROFORMA_PDF_STATUS_LABEL.generating
            : "下载 PDF"}
        </button>
      )}
    </span>
  );
}
