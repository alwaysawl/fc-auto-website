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
  ready: "发票已保存，PDF 已生成，请在系统菜单中选择「存储到文件」。",
  outdated: "发票内容已更改，请重新下载 PDF",
  sharing: "正在打开系统分享…",
  shared: "发票已保存，PDF 已生成，请在系统菜单中选择「存储到文件」。",
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
 * Fetch the server PDF as a fresh application/pdf File for the CURRENT invoice.
 * Rejects non-PDF responses (JSON/HTML/text) so they are never shared as files.
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

  const filename = buildProformaDownloadFilename(number);
  const t = Date.now();
  const url =
    `/api/admin/proforma-invoices/${encodeURIComponent(id)}/pdf` +
    `?disposition=attachment` +
    `&invoiceId=${encodeURIComponent(id)}` +
    `&t=${t}`;

  dbg("fetch start", {
    invoiceId: id,
    invoiceNumber: number,
    filename,
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
    responseUrl: res.url,
    contentType: res.headers.get("content-type"),
    contentDisposition: res.headers.get("content-disposition"),
  });

  if (!res.ok) {
    throw new Error(
      (await readErrorMessage(res)) || `PDF request failed: ${res.status}`
    );
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/pdf")) {
    const errorText = await res.text();
    console.error("Expected PDF but received:", { contentType, errorText });
    throw new Error("服务器返回的不是 PDF");
  }

  const pdfBlob = await res.blob();
  dbg("blob", { type: pdfBlob.type, size: pdfBlob.size });

  if (!pdfBlob.size) {
    throw new Error("PDF 文件为空");
  }

  // Force application/pdf — never trust an empty/mismatched blob.type.
  const typedBlob =
    pdfBlob.type === "application/pdf"
      ? pdfBlob
      : new Blob([pdfBlob], { type: "application/pdf" });

  const file = new File([typedBlob], filename, {
    type: "application/pdf",
    lastModified: Date.now(),
  });

  if (file.type !== "application/pdf") {
    throw new Error("创建的 File 不是 application/pdf");
  }
  if (!file.name.includes(number) || !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error(`生成的文件名无效：${file.name}`);
  }

  dbg("file ready", {
    invoiceId: id,
    invoiceNumber: number,
    filename: file.name,
    type: file.type,
    blobSize: file.size,
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
 * Share exactly one PDF File via Web Share (files only — no text/url/title),
 * or desktop <a download>. Never both.
 */
export async function exportProformaPdfFile(file: File): Promise<{
  method: "share" | "download";
  filename: string;
}> {
  if (file.type !== "application/pdf" || !file.size) {
    throw new Error("只能导出有效的 PDF 文件");
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (
    typeof navigator.share === "function" &&
    typeof nav.canShare === "function" &&
    nav.canShare({ files: [file] })
  ) {
    // CRITICAL: files only. title/text/url can create iOS「文本 N」junk files.
    await navigator.share({
      files: [file],
    });
    return { method: "share", filename: file.name };
  }

  if (isAppleMobileBrowser()) {
    throw new Error("当前浏览器不支持直接分享 PDF，请使用 Safari 打开。");
  }

  // Desktop only — never run this after a successful share.
  const result = await shareOrSavePdfFile(file);
  return { method: result.method, filename: result.filename };
}

/**
 * @deprecated Prefer exportProformaPdfFile — kept for call-site migration.
 */
export async function shareOrSaveProformaPdfFile(
  file: File,
  expectedInvoiceNumber: string
): Promise<{
  method: "share" | "download";
  message: string;
}> {
  const number = expectedInvoiceNumber.trim();
  if (!number || !file.name.includes(number)) {
    throw new Error(
      `PDF 与当前发票不匹配（文件：${file.name}，发票：${number}）。请重新生成 PDF。`
    );
  }

  const result = await exportProformaPdfFile(file);
  return {
    method: result.method,
    message:
      result.method === "share"
        ? PROFORMA_PDF_STATUS_LABEL.shared
        : PROFORMA_PDF_STATUS_LABEL.downloaded,
  };
}

/**
 * Desktop one-shot: fetch then download/share.
 * On Apple mobile returns "ready" without sharing (caller must export on gesture).
 */
export async function downloadProformaPdf(
  invoiceId: string,
  options: {
    invoiceNumber: string;
    onStatus?: (status: ProformaPdfStatus, detail?: string) => void;
  }
): Promise<{
  filename: string;
  status: ProformaPdfStatus;
  message: string;
  file?: File;
}> {
  options.onStatus?.("generating");
  const fetched = await fetchProformaPdfFile(
    invoiceId,
    options.invoiceNumber
  );

  if (isAppleMobileBrowser()) {
    options.onStatus?.("ready", PROFORMA_PDF_STATUS_LABEL.ready);
    return {
      filename: fetched.file.name,
      status: "ready",
      message: PROFORMA_PDF_STATUS_LABEL.ready,
      file: fetched.file,
    };
  }

  options.onStatus?.("sharing");
  try {
    const result = await exportProformaPdfFile(fetched.file);
    const status: ProformaPdfStatus =
      result.method === "share" ? "shared" : "downloaded";
    const message =
      result.method === "share"
        ? PROFORMA_PDF_STATUS_LABEL.shared
        : PROFORMA_PDF_STATUS_LABEL.downloaded;
    options.onStatus?.(status, message);
    return { filename: fetched.file.name, status, message };
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
 * Not used by the editor「保存并生成 PDF」button.
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
