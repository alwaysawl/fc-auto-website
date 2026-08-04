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

/**
 * Production Proforma PDF controls.
 *
 * iPhone/iPad (strict Web Share):
 *   1) 生成 PDF → fetch Blob → File in state (no navigation)
 *   2) 分享或保存 PDF → navigator.share IMMEDIATELY on the click gesture
 *      (no fetch / setState / other async work before share)
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
  /** Current invoice PDF File — only set by 生成 PDF / matching seed. */
  const [generatedPdfFile, setGeneratedPdfFile] = useState<File | null>(null);
  const [generatedMeta, setGeneratedMeta] = useState<{
    invoiceId: string;
    invoiceNumber: string;
  } | null>(null);
  /** Ref so share handler can read the File without any async/state delay. */
  const generatedPdfFileRef = useRef<File | null>(null);
  const signatureAtGeneration = useRef<string>("");

  const setMsg = useCallback(
    (msg: string | null) => onMessage?.(msg),
    [onMessage]
  );
  const setErr = useCallback(
    (err: string | null) => onError?.(err),
    [onError]
  );

  const clearGenerated = useCallback(() => {
    generatedPdfFileRef.current = null;
    setGeneratedPdfFile(null);
    setGeneratedMeta(null);
  }, []);

  // Switching invoices: wipe generated PDF completely.
  useEffect(() => {
    clearGenerated();
    setStatus("idle");
    setBusy(false);
    signatureAtGeneration.current = "";
    setMsg(null);
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on identity change
  }, [invoiceId, invoiceNumber]);

  // Accept parent seed only when it matches the invoice on screen.
  useEffect(() => {
    if (!seedReady) return;
    if (
      seedReady.invoiceId !== invoiceId ||
      seedReady.invoiceNumber !== invoiceNumber ||
      !seedReady.file.name.includes(invoiceNumber)
    ) {
      onSeedConsumed?.();
      return;
    }
    generatedPdfFileRef.current = seedReady.file;
    setGeneratedPdfFile(seedReady.file);
    setGeneratedMeta({
      invoiceId: seedReady.invoiceId,
      invoiceNumber: seedReady.invoiceNumber,
    });
    signatureAtGeneration.current = contentSignature;
    setStatus("ready");
    setMsg(`已生成：\n${seedReady.file.name}`);
    onSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedReady]);

  // Form edits after generation → must regenerate.
  useEffect(() => {
    if (!generatedPdfFile) return;
    if (
      contentSignature &&
      signatureAtGeneration.current &&
      contentSignature !== signatureAtGeneration.current
    ) {
      clearGenerated();
      setStatus("outdated");
      setMsg(PROFORMA_PDF_STATUS_LABEL.outdated);
    }
  }, [contentSignature, generatedPdfFile, clearGenerated, setMsg]);

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

  const handleGeneratePdf = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy || disabled) return;

    clearGenerated();
    setBusy(true);
    setErr(null);
    setStatus("generating");
    setMsg(PROFORMA_PDF_STATUS_LABEL.generating);

    try {
      const fetched = await fetchProformaPdfFile(invoiceId, invoiceNumber);
      if (
        fetched.invoiceId !== invoiceId ||
        fetched.invoiceNumber !== invoiceNumber ||
        !fetched.file.name.includes(invoiceNumber)
      ) {
        throw new Error("生成结果与当前发票不一致，请重试");
      }

      generatedPdfFileRef.current = fetched.file;
      setGeneratedPdfFile(fetched.file);
      setGeneratedMeta({
        invoiceId: fetched.invoiceId,
        invoiceNumber: fetched.invoiceNumber,
      });
      signatureAtGeneration.current = contentSignature;
      setStatus("ready");
      setMsg(`已生成：\n${fetched.file.name}`);
    } catch (err) {
      clearGenerated();
      setStatus("error");
      const message =
        err instanceof Error ? err.message : PROFORMA_PDF_STATUS_LABEL.error;
      setErr(message);
      setMsg(null);
    } finally {
      setBusy(false);
    }
  };

  const handleDesktopDownload = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
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
      setMsg(
        result.status === "downloaded" || result.status === "shared"
          ? `${result.message}\n${result.filename}`
          : result.message
      );
      setStatus(result.status);
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

  /**
   * STRICT iOS share: call navigator.share on this click with no prior await/setState.
   * Do not open Files, download anchors, or navigate.
   */
  async function handleShareOrSavePdf(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const file = generatedPdfFileRef.current;

    if (!file || file.size === 0) {
      window.alert("请先生成 PDF");
      return;
    }

    if (!file.name.includes(invoiceNumber)) {
      window.alert(
        `PDF 与当前发票不匹配（文件：${file.name}，发票：${invoiceNumber}）。请重新生成 PDF。`
      );
      clearGenerated();
      setStatus("outdated");
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

    // FIRST await must be navigator.share — preserve the user gesture.
    try {
      await navigator.share({
        files: [file],
        title: file.name,
      });
      // Resolves after the user finishes a share action (e.g. Save to Files + 存储).
      // Do NOT claim "保存成功" — iOS does not tell us which target was used.
      setStatus("shared");
      setMsg(`系统分享已完成\n${file.name}`);
    } catch (error) {
      const err = error as { name?: string };
      if (err?.name === "AbortError") {
        // User dismissed the sheet or cancelled Save to Files — not a save success.
        setMsg("已取消分享");
        return;
      }
      console.error("[ProformaPdfActions] navigator.share failed", error);
      window.alert("系统分享菜单打开失败");
      setStatus("error");
      setErr("系统分享菜单打开失败");
    }
  }

  const pad = compact
    ? "rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-50"
    : buttonClassName;

  const shareEnabled =
    !!generatedPdfFile &&
    !busy &&
    !disabled &&
    status !== "outdated" &&
    generatedMeta?.invoiceId === invoiceId &&
    generatedMeta?.invoiceNumber === invoiceNumber &&
    generatedPdfFile.name.includes(invoiceNumber);

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
            onClick={(e) => void handleGeneratePdf(e)}
            className={pad}
          >
            {busy && status === "generating"
              ? PROFORMA_PDF_STATUS_LABEL.generating
              : "生成 PDF"}
          </button>
          <button
            type="button"
            disabled={!shareEnabled}
            onClick={(e) => void handleShareOrSavePdf(e)}
            className={pad}
          >
            分享或保存 PDF
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={(e) => void handleDesktopDownload(e)}
          className={pad}
        >
          {busy
            ? PROFORMA_PDF_STATUS_LABEL[status] ||
              PROFORMA_PDF_STATUS_LABEL.generating
            : "下载 PDF"}
        </button>
      )}

      {apple ? (
        <span
          className="mt-1 w-full basis-full rounded border border-dashed border-amber-300 bg-amber-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-amber-950"
          data-pdf-share-debug="1"
        >
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
          <br />
          invoice: {invoiceNumber} / {invoiceId}
        </span>
      ) : null}
    </span>
  );
}
