"use client";

import { deliverPdfBlob, type PdfDeliveryResult } from "@/lib/pdf/deliverPdfBlob";
import { buildProformaDownloadFilename } from "@/lib/proforma/pdfDownloadName";

export type ProformaPdfStatus =
  | "generating"
  | "preparing"
  | "shared"
  | "downloaded"
  | "ios-fallback"
  | "error";

export const PROFORMA_PDF_STATUS_LABEL: Record<ProformaPdfStatus, string> = {
  generating: "正在生成 PDF…",
  preparing: "正在准备下载…",
  shared: "已打开系统分享",
  downloaded: "PDF 已开始下载",
  "ios-fallback": "请点击浏览器分享按钮，然后选择「存储到文件」",
  error: "下载失败，请重试",
};

function statusFromDelivery(result: PdfDeliveryResult): ProformaPdfStatus {
  if (result.method === "share") return "shared";
  if (result.method === "ios-fallback") return "ios-fallback";
  return "downloaded";
}

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

export type DownloadProformaPdfOptions = {
  invoiceNumber?: string | null;
  onStatus?: (status: ProformaPdfStatus, detail?: string) => void;
};

/**
 * Download (save/share) a server-generated Proforma PDF.
 * Fetches as Blob — does not navigate or window.open for the happy path.
 */
export async function downloadProformaPdf(
  invoiceId: string,
  options?: DownloadProformaPdfOptions
): Promise<{ filename: string; status: ProformaPdfStatus; message: string }> {
  const id = invoiceId?.trim();
  if (!id) throw new Error("缺少发票 ID，无法下载 PDF");

  const onStatus = options?.onStatus;
  onStatus?.("generating");

  const res = await fetch(
    `/api/admin/proforma-invoices/${id}/pdf?disposition=attachment`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/pdf" },
    }
  );

  if (!res.ok) {
    onStatus?.("error");
    throw new Error(await readErrorMessage(res));
  }

  onStatus?.("preparing");
  const blob = await res.blob();
  const filename = buildProformaDownloadFilename(
    options?.invoiceNumber?.trim() ||
      // Prefer Content-Disposition filename when present
      parseFilenameFromContentDisposition(
        res.headers.get("content-disposition")
      ) ||
      "PI"
  );

  try {
    const delivery = await deliverPdfBlob(blob, filename);
    const status = statusFromDelivery(delivery);
    const message =
      delivery.message || PROFORMA_PDF_STATUS_LABEL[status];
    onStatus?.(status, message);
    return { filename, status, message };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    onStatus?.("error");
    throw err instanceof Error
      ? err
      : new Error(PROFORMA_PDF_STATUS_LABEL.error);
  }
}

/**
 * Preview PDF in a new tab (inline disposition). Separate from download.
 */
export function previewProformaPdf(invoiceId: string): void {
  const id = invoiceId?.trim();
  if (!id) throw new Error("缺少发票 ID，无法预览 PDF");
  const url = `/api/admin/proforma-invoices/${id}/pdf?disposition=inline`;
  const opened = window.open(url, "_blank");
  if (!opened) {
    throw new Error("无法打开预览，请允许浏览器弹窗后重试");
  }
}

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
    return plain[1].replace(/\.pdf$/i, "").replace(/^FC-Auto-Proforma-Invoice-/i, "");
  }
  return null;
}
