"use client";

import { PROFORMA_PDF_DOWNLOAD_FILENAME } from "@/lib/proforma/pdfDownloadName";

/**
 * Detect phones / tablets where `<a download>` is unreliable
 * (iPhone Safari, Android Chrome, Samsung Internet, iPadOS).
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";

  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  if (/Android/i.test(ua)) return true; // tablets
  if (/SamsungBrowser/i.test(ua)) return true;
  if (/Mobile/i.test(ua) && /Safari/i.test(ua) && !/Chrome|CriOS|EdgiOS/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ reports as Macintosh with touch
  if (
    /Macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }
  return false;
}

function triggerDesktopDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

async function tryNativeShare(file: File): Promise<"shared" | "cancelled" | "unavailable"> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof navigator.share !== "function") return "unavailable";
  if (typeof nav.canShare === "function" && !nav.canShare({ files: [file] })) {
    return "unavailable";
  }
  try {
    await navigator.share({
      files: [file],
      title: file.name,
    });
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "cancelled";
    return "unavailable";
  }
}

/**
 * Mobile: Share API when available, otherwise open a Blob URL in a new tab.
 * Never relies solely on the HTML download attribute.
 */
async function deliverMobilePdf(
  blob: Blob,
  filename: string,
  previewWindow: Window | null
): Promise<void> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const shareResult = await tryNativeShare(file);
  if (shareResult === "shared") {
    previewWindow?.close();
    return;
  }
  // Share unavailable or user cancelled → open Blob URL in a new tab.
  const url = URL.createObjectURL(blob);
  try {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.href = url;
    } else {
      // Do not pass "noopener" here — modern browsers then return null and
      // we cannot detect popup blocking.
      const opened = window.open(url, "_blank");
      if (!opened) {
        // Popup blocked: navigate current tab so the user still gets the PDF.
        window.location.assign(url);
        return;
      }
    }
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const fallback = "PDF 下载失败";
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: string };
      return json.error?.trim() || fallback;
    }
    const text = (await res.text()).trim();
    return text.slice(0, 200) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetch a server-generated Proforma PDF and deliver it cross-platform:
 * - Desktop → automatic download of Invoice.pdf
 * - Mobile → Share API or open in a new tab (Blob URL, iOS-safe)
 */
export async function downloadProformaPdf(
  invoiceId: string
): Promise<{ filename: string }> {
  const id = invoiceId?.trim();
  if (!id) throw new Error("缺少发票 ID，无法下载 PDF");

  const filename = PROFORMA_PDF_DOWNLOAD_FILENAME;
  const mobile = isMobileBrowser();

  // Open a blank tab synchronously with the user gesture so iOS does not block it
  // after the async fetch completes.
  let previewWindow: Window | null = null;
  if (mobile) {
    previewWindow = window.open("about:blank", "_blank");
  }

  try {
    const res = await fetch(`/api/admin/proforma-invoices/${id}/pdf`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/pdf" },
    });

    if (!res.ok) {
      throw new Error(await readErrorMessage(res));
    }

    const buffer = await res.arrayBuffer();
    // Explicit MIME so iOS Safari treats the Blob URL as a PDF.
    const pdfBlob = new Blob([buffer], { type: "application/pdf" });

    if (mobile) {
      await deliverMobilePdf(pdfBlob, filename, previewWindow);
    } else {
      previewWindow?.close();
      triggerDesktopDownload(pdfBlob, filename);
    }

    return { filename };
  } catch (err) {
    previewWindow?.close();
    throw err;
  }
}
