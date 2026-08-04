"use client";

import {
  canSharePdfFile,
  isAppleMobileBrowser,
  shareOrSavePdfFile,
} from "@/lib/pdf/deliverPdfBlob";
import { buildProformaDownloadFilename } from "@/lib/proforma/pdfDownloadName";

const DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_PDF_DEBUG === "1";

function dbg(...args: unknown[]) {
  if (DEBUG) console.info("[proforma-pdf]", ...args);
}

export type ProformaPdfStatus =
  | "idle"
  | "generating"
  | "ready"
  | "sharing"
  | "shared"
  | "downloaded"
  | "error";

export const PROFORMA_PDF_STATUS_LABEL: Record<ProformaPdfStatus, string> = {
  idle: "",
  generating: "正在生成 PDF…",
  ready: "PDF 已生成，请点「分享或保存 PDF」",
  sharing: "正在打开系统分享…",
  shared: "已打开系统分享",
  downloaded: "PDF 已开始下载",
  error: "下载失败，请重试",
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: string };
      return json.error?.trim() || PROFORMA_PDF_STATUS_LABEL.error;
    }
    const text = (await res.text()).trim();
    return text.slice(0, 200) || PROFORMA_PDF_STATUS_LABEL.error;
  } catch {
    return PROFORMA_PDF_STATUS_LABEL.error;
  }
}

/**
 * Fetch the server PDF as a File. Does not navigate, open tabs, or share.
 */
export async function fetchProformaPdfFile(
  invoiceId: string,
  invoiceNumber?: string | null
): Promise<File> {
  const id = invoiceId?.trim();
  if (!id) throw new Error("缺少发票 ID，无法生成 PDF");

  const url = `/api/admin/proforma-invoices/${id}/pdf?disposition=attachment`;
  dbg("fetch start", { component: "downloadProformaPdf.ts", url });

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/pdf" },
    redirect: "follow",
  });

  dbg("fetch response", {
    status: res.status,
    redirected: res.redirected,
    responseUrl: res.url,
    contentType: res.headers.get("content-type"),
    contentDisposition: res.headers.get("content-disposition"),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const blob = await res.blob();
  dbg("blob", { type: blob.type, size: blob.size });

  if (!blob.size) {
    throw new Error("Generated PDF is empty");
  }

  const pdfBlob =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });

  const filename = buildProformaDownloadFilename(
    invoiceNumber?.trim() ||
      parseFilenameFromContentDisposition(
        res.headers.get("content-disposition")
      ) ||
      "PI"
  );

  return new File([pdfBlob], filename, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

/**
 * Share/save an already-generated File from a direct user gesture.
 * No network request before navigator.share on iOS.
 */
export async function shareOrSaveProformaPdfFile(file: File): Promise<{
  method: "share" | "download";
  message: string;
}> {
  dbg("shareOrSave", {
    filename: file.name,
    size: file.size,
    shareAvailable: typeof navigator.share === "function",
    canShare: canSharePdfFile(file),
    isApple: isAppleMobileBrowser(),
  });

  const result = await shareOrSavePdfFile(file);
  return {
    method: result.method,
    message:
      result.method === "share"
        ? PROFORMA_PDF_STATUS_LABEL.shared
        : PROFORMA_PDF_STATUS_LABEL.downloaded,
  };
}

/**
 * Desktop / Android one-shot: fetch then download/share.
 * On Apple mobile this is unsafe for Share (user activation expires) —
 * prefer fetchProformaPdfFile + shareOrSaveProformaPdfFile two-step UI.
 */
export async function downloadProformaPdf(
  invoiceId: string,
  options?: {
    invoiceNumber?: string | null;
    onStatus?: (status: ProformaPdfStatus, detail?: string) => void;
  }
): Promise<{ filename: string; status: ProformaPdfStatus; message: string }> {
  options?.onStatus?.("generating");
  const file = await fetchProformaPdfFile(
    invoiceId,
    options?.invoiceNumber
  );

  if (isAppleMobileBrowser()) {
    // Do not attempt share after async fetch on iOS — caller must use two-step UI.
    options?.onStatus?.("ready", PROFORMA_PDF_STATUS_LABEL.ready);
    return {
      filename: file.name,
      status: "ready",
      message: PROFORMA_PDF_STATUS_LABEL.ready,
    };
  }

  options?.onStatus?.("sharing");
  try {
    const result = await shareOrSaveProformaPdfFile(file);
    const status: ProformaPdfStatus =
      result.method === "share" ? "shared" : "downloaded";
    options?.onStatus?.(status, result.message);
    return { filename: file.name, status, message: result.message };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    options?.onStatus?.("error");
    throw err instanceof Error
      ? err
      : new Error(PROFORMA_PDF_STATUS_LABEL.error);
  }
}

/**
 * Preview only — may open Safari PDF viewer in a new tab.
 * Never use this for the Download / Share action.
 */
export function previewProformaPdf(
  invoiceId: string,
  event?: { preventDefault?: () => void; stopPropagation?: () => void }
): void {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const id = invoiceId?.trim();
  if (!id) throw new Error("缺少发票 ID，无法预览 PDF");
  const url = `/api/admin/proforma-invoices/${id}/pdf?disposition=inline`;
  dbg("preview window.open", { url });
  const opened = window.open(url, "_blank");
  if (!opened) {
    throw new Error("无法打开预览，请允许浏览器弹窗后重试");
  }
}

export { isAppleMobileBrowser, canSharePdfFile };

function parseFilenameFromContentDisposition(
  header: string | null
): string | null {
  if (!header) return null;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]).replace(/\.pdf$/i, "");
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  if (plain?.[1]) {
    return plain[1]
      .replace(/\.pdf$/i, "")
      .replace(/^FC-Auto-Proforma-Invoice-/i, "");
  }
  return null;
}
