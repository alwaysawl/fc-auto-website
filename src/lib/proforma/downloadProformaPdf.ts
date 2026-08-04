"use client";

import {
  canSharePdfFile,
  isAppleMobileBrowser,
  shareOrSavePdfFile,
} from "@/lib/pdf/deliverPdfBlob";
import { buildProformaDownloadFilename } from "@/lib/proforma/pdfDownloadName";

/** Always log stale-PDF diagnostics until verified in production. */
function dbg(...args: unknown[]) {
  console.info("[proforma-pdf]", ...args);
}

export type ProformaPdfStatus =
  | "idle"
  | "generating"
  | "ready"
  | "outdated"
  | "sharing"
  | "shared"
  | "downloaded"
  | "error";

export const PROFORMA_PDF_STATUS_LABEL: Record<ProformaPdfStatus, string> = {
  idle: "",
  generating: "正在生成 PDF…",
  ready: "PDF 已生成，请在系统菜单中选择「存储到文件」",
  outdated: "发票内容已更改，请重新下载 PDF",
  sharing: "正在打开系统分享…",
  shared: "PDF 已生成，请在系统菜单中选择「存储到文件」",
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

export type FetchedProformaPdf = {
  file: File;
  invoiceId: string;
  invoiceNumber: string;
  generatedAt: number;
  responseUrl: string;
  blobSize: number;
};

/**
 * Fetch the server PDF as a fresh File for the CURRENT invoice.
 * Never reuses prior Files. Cache-busts the request.
 */
export async function fetchProformaPdfFile(
  invoiceId: string,
  invoiceNumber: string
): Promise<FetchedProformaPdf> {
  const id = invoiceId?.trim();
  const number = invoiceNumber?.trim();
  if (!id) throw new Error("缺少发票 ID，无法生成 PDF");
  if (!number || number.startsWith("（")) {
    throw new Error("缺少发票编号，无法生成 PDF");
  }

  const expectedFilename = buildProformaDownloadFilename(number);
  const t = Date.now();
  const url =
    `/api/admin/proforma-invoices/${encodeURIComponent(id)}/pdf` +
    `?disposition=attachment` +
    `&invoiceId=${encodeURIComponent(id)}` +
    `&t=${t}`;

  dbg("fetch start", {
    invoiceId: id,
    invoiceNumber: number,
    expectedFilename,
    url,
    t,
  });

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/pdf",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    redirect: "follow",
  });

  dbg("fetch response", {
    status: res.status,
    redirected: res.redirected,
    responseUrl: res.url,
    contentType: res.headers.get("content-type"),
    contentDisposition: res.headers.get("content-disposition"),
    cacheControl: res.headers.get("cache-control"),
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

  // Filename from CURRENT invoice number only — never from stale closures / old CD header alone.
  const filename = buildProformaDownloadFilename(number);
  const file = new File([pdfBlob], filename, {
    type: "application/pdf",
    lastModified: Date.now(),
  });

  if (!file.name.includes(number)) {
    throw new Error(
      `生成的文件名与当前发票号不一致：${file.name} / ${number}`
    );
  }

  dbg("file ready", {
    invoiceId: id,
    invoiceNumber: number,
    filename: file.name,
    blobSize: file.size,
    generatedAt: file.lastModified,
  });

  return {
    file,
    invoiceId: id,
    invoiceNumber: number,
    generatedAt: file.lastModified,
    responseUrl: res.url,
    blobSize: file.size,
  };
}

/**
 * Share/save an already-generated File from a direct user gesture.
 * Verifies the File still matches the expected invoice number.
 */
export async function shareOrSaveProformaPdfFile(
  file: File,
  expectedInvoiceNumber: string
): Promise<{
  method: "share" | "download";
  message: string;
}> {
  const number = expectedInvoiceNumber.trim();
  dbg("shareOrSave verify", {
    filename: file.name,
    expectedInvoiceNumber: number,
    size: file.size,
    shareAvailable: typeof navigator.share === "function",
    canShare: canSharePdfFile(file),
    isApple: isAppleMobileBrowser(),
  });

  if (!number || !file.name.includes(number)) {
    throw new Error(
      `PDF 与当前发票不匹配（文件：${file.name}，发票：${number}）。请重新生成 PDF。`
    );
  }

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
 * Desktop / Android one-shot: fetch then download.
 * On Apple mobile returns "ready" without sharing (use two-step UI).
 */
export async function downloadProformaPdf(
  invoiceId: string,
  options: {
    invoiceNumber: string;
    onStatus?: (status: ProformaPdfStatus, detail?: string) => void;
  }
): Promise<{ filename: string; status: ProformaPdfStatus; message: string; file?: File }> {
  options.onStatus?.("generating");
  const fetched = await fetchProformaPdfFile(
    invoiceId,
    options.invoiceNumber
  );

  if (isAppleMobileBrowser()) {
    options.onStatus?.(
      "ready",
      `已生成：\n${fetched.file.name}`
    );
    return {
      filename: fetched.file.name,
      status: "ready",
      message: `已生成：\n${fetched.file.name}`,
      file: fetched.file,
    };
  }

  options.onStatus?.("sharing");
  try {
    const result = await shareOrSaveProformaPdfFile(
      fetched.file,
      options.invoiceNumber
    );
    const status: ProformaPdfStatus =
      result.method === "share" ? "shared" : "downloaded";
    options.onStatus?.(status, result.message);
    return { filename: fetched.file.name, status, message: result.message };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    options.onStatus?.("error");
    throw err instanceof Error
      ? err
      : new Error(PROFORMA_PDF_STATUS_LABEL.error);
  }
}

/**
 * Preview only — may open Safari PDF viewer in a new tab.
 * Cache-busted so it never shows another invoice's PDF.
 */
export function previewProformaPdf(
  invoiceId: string,
  event?: { preventDefault?: () => void; stopPropagation?: () => void }
): void {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const id = invoiceId?.trim();
  if (!id) throw new Error("缺少发票 ID，无法预览 PDF");
  const t = Date.now();
  const url =
    `/api/admin/proforma-invoices/${encodeURIComponent(id)}/pdf` +
    `?disposition=inline` +
    `&invoiceId=${encodeURIComponent(id)}` +
    `&t=${t}`;
  dbg("preview window.open", { url, invoiceId: id, t });
  const opened = window.open(url, "_blank");
  if (!opened) {
    throw new Error("无法打开预览，请允许浏览器弹窗后重试");
  }
}

export { isAppleMobileBrowser, canSharePdfFile, buildProformaDownloadFilename };
