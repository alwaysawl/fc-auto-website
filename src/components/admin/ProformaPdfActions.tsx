"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  fetchProformaPdfFile,
  isAppleMobileBrowser,
  previewProformaPdf,
  shareOrSaveProformaPdfFile,
  downloadProformaPdf,
  PROFORMA_PDF_STATUS_LABEL,
  type ProformaPdfStatus,
  type FetchedProformaPdf,
} from "@/lib/proforma/downloadProformaPdf";

const btnGhost =
  "inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-60";

type ReadyPdf = FetchedProformaPdf;

type ProformaPdfActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  /** When this changes after a PDF was generated, the PDF is marked outdated. */
  contentSignature?: string;
  /**
   * Optional freshly-fetched PDF from parent (e.g. after 保存并生成 PDF).
   * Must match current invoiceId/invoiceNumber or it is ignored.
   */
  seedReady?: FetchedProformaPdf | null;
  onSeedConsumed?: () => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  onMessage?: (message: string | null) => void;
  onError?: (error: string | null) => void;
};

function clearReady(
  setReady: (v: ReadyPdf | null) => void,
  blobUrlRef: React.MutableRefObject<string | null>
) {
  if (blobUrlRef.current) {
    URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = null;
  }
  setReady(null);
}

/**
 * Production Proforma PDF controls with stale-file protection.
 *
 * iPhone/iPad:
 *   1) 生成 PDF → fresh fetch for CURRENT invoiceId/number
 *   2) 分享或保存 PDF → share only if File matches current invoice
 *
 * Desktop: 下载 PDF one-shot.
 * 预览 PDF is separate.
 */
export default function ProformaPdfActions({
  invoiceId,
  invoiceNumber,
  contentSignature = "",
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
  const [ready, setReady] = useState<ReadyPdf | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const signatureAtGeneration = useRef<string>("");

  const setMsg = useCallback(
    (msg: string | null) => onMessage?.(msg),
    [onMessage]
  );
  const setErr = useCallback(
    (err: string | null) => onError?.(err),
    [onError]
  );

  // Switching invoices / remount: wipe all generated PDF state.
  useEffect(() => {
    console.info("[ProformaPdfActions] reset for invoice", {
      invoiceId,
      invoiceNumber,
    });
    clearReady(setReady, blobUrlRef);
    setStatus("idle");
    setBusy(false);
    signatureAtGeneration.current = "";
    setMsg(null);
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on identity change
  }, [invoiceId, invoiceNumber]);

  // Accept a parent-provided fresh File (save + generate), never an old one.
  useEffect(() => {
    if (!seedReady) return;
    if (
      seedReady.invoiceId !== invoiceId ||
      seedReady.invoiceNumber !== invoiceNumber ||
      !seedReady.file.name.includes(invoiceNumber)
    ) {
      console.info("[ProformaPdfActions] ignore mismatched seed", {
        seed: seedReady.file.name,
        invoiceId,
        invoiceNumber,
      });
      onSeedConsumed?.();
      return;
    }
    clearReady(setReady, blobUrlRef);
    signatureAtGeneration.current = contentSignature;
    setReady(seedReady);
    setStatus("ready");
    setMsg(`已生成：\n${seedReady.file.name}`);
    onSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedReady]);

  // Form edits after generation → outdated (must regenerate).
  useEffect(() => {
    if (!ready) return;
    if (
      contentSignature &&
      signatureAtGeneration.current &&
      contentSignature !== signatureAtGeneration.current
    ) {
      console.info("[ProformaPdfActions] content changed → outdated", {
        invoiceId,
        invoiceNumber,
        prev: signatureAtGeneration.current,
        next: contentSignature,
      });
      clearReady(setReady, blobUrlRef);
      setStatus("outdated");
      setMsg(PROFORMA_PDF_STATUS_LABEL.outdated);
    }
  }, [contentSignature, ready, invoiceId, invoiceNumber, setMsg]);

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

  const handleGenerateOrDownload = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy || disabled) return;

    // Never reuse a previous File — clear first.
    clearReady(setReady, blobUrlRef);

    console.info("[ProformaPdfActions] generate click", {
      component: "ProformaPdfActions.tsx",
      invoiceId,
      invoiceNumber,
      apple,
      t: Date.now(),
    });

    setBusy(true);
    setErr(null);
    setStatus("generating");
    setMsg(PROFORMA_PDF_STATUS_LABEL.generating);

    try {
      if (apple) {
        const fetched = await fetchProformaPdfFile(invoiceId, invoiceNumber);
        if (
          fetched.invoiceId !== invoiceId ||
          fetched.invoiceNumber !== invoiceNumber
        ) {
          throw new Error("生成结果与当前发票不一致，请重试");
        }
        if (!fetched.file.name.includes(invoiceNumber)) {
          throw new Error(
            `文件名未包含当前发票号：${fetched.file.name}`
          );
        }
        signatureAtGeneration.current = contentSignature;
        setReady(fetched);
        setStatus("ready");
        setMsg(`已生成：\n${fetched.file.name}`);
      } else {
        const result = await downloadProformaPdf(invoiceId, {
          invoiceNumber,
          onStatus: (s, detail) => {
            setStatus(s);
            setMsg(detail || PROFORMA_PDF_STATUS_LABEL[s]);
          },
        });
        setMsg(
          result.status === "downloaded" || result.status === "shared"
            ? `${result.message}\n${result.filename}`
            : result.message
        );
        setStatus(result.status);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMsg("已取消分享");
      } else {
        clearReady(setReady, blobUrlRef);
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

  const handleShareOrSave = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!ready || busy) return;

    // Guard: File must still match the CURRENT invoice on screen.
    if (
      ready.invoiceId !== invoiceId ||
      ready.invoiceNumber !== invoiceNumber ||
      !ready.file.name.includes(invoiceNumber)
    ) {
      clearReady(setReady, blobUrlRef);
      setStatus("outdated");
      setErr("PDF 已过期或不属于当前发票，请重新生成 PDF");
      setMsg(PROFORMA_PDF_STATUS_LABEL.outdated);
      return;
    }

    console.info("[ProformaPdfActions] share click", {
      filename: ready.file.name,
      invoiceNumber,
      size: ready.blobSize,
      generatedAt: ready.generatedAt,
    });

    setBusy(true);
    setStatus("sharing");
    setMsg(PROFORMA_PDF_STATUS_LABEL.sharing);
    setErr(null);

    try {
      const result = await shareOrSaveProformaPdfFile(
        ready.file,
        invoiceNumber
      );
      setStatus(result.method === "share" ? "shared" : "downloaded");
      setMsg(`${result.message}\n${ready.file.name}`);
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

  const shareEnabled =
    !!ready &&
    !busy &&
    !disabled &&
    status !== "outdated" &&
    ready.invoiceId === invoiceId &&
    ready.invoiceNumber === invoiceNumber &&
    ready.file.name.includes(invoiceNumber);

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
            disabled={!shareEnabled}
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
