"use client";

/**
 * Cross-platform PDF delivery from an already-in-memory File/Blob.
 *
 * - Desktop / Android: prefer <a download> (does not navigate away).
 * - iPhone / iPad: Web Share with { files } only (no title/text → no「文本 N」).
 * - NEVER window.open / location.href for the download path.
 */

export type PdfDeliveryMethod = "share" | "download";

export type PdfDeliveryResult = {
  method: PdfDeliveryMethod;
  filename: string;
};

/** iPhone / iPod / iPad (including iPadOS desktop UA). */
export function isAppleMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  if (
    /Macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }
  return false;
}

/** Phones/tablets that should not see desktop-only download actions. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isAppleMobileBrowser()) return true;
  const ua = navigator.userAgent || "";
  return /Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
}

export function canSharePdfFile(file: File): boolean {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof navigator.share !== "function") return false;
  if (typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Whether this browser generally supports the Web Share API for files. */
export function supportsFileWebShare(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.canShare !== "function") return false;
  try {
    const probe = new File([new Uint8Array([37, 80, 68, 70])], "probe.pdf", {
      type: "application/pdf",
    });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  a.setAttribute("data-pdf-download", "1");
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay revoke so the browser can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Open a PDF File in a new tab for preview (does not navigate the current page).
 */
export function openPdfFilePreview(file: File): void {
  const url = URL.createObjectURL(file);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!opened) {
    throw new Error("无法打开预览，请允许浏览器弹窗后重试");
  }
}

/**
 * Share a PDF via Web Share (files only) or download via <a download>.
 * Call from a direct user gesture. On Apple, prefer calling share with a
 * pre-generated File on a fresh tap (no await fetch before share).
 */
export async function shareOrSavePdfFile(
  file: File
): Promise<PdfDeliveryResult> {
  if (file.type !== "application/pdf" || !file.size) {
    throw new Error("只能分享有效的 PDF 文件");
  }

  if (canSharePdfFile(file)) {
    try {
      await navigator.share({
        files: [file],
      });
      return { method: "share", filename: file.name };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      if (isAppleMobileBrowser()) {
        throw err instanceof Error
          ? err
          : new Error("系统分享失败，请重试");
      }
      // Non-Apple: fall through to anchor download.
    }
  } else if (isAppleMobileBrowser()) {
    throw new Error(
      "当前浏览器不支持直接分享 PDF，请使用 Safari 打开，或点「预览 PDF」后从浏览器分享。"
    );
  }

  triggerAnchorDownload(file, file.name);
  return { method: "download", filename: file.name };
}

/** @deprecated Use shareOrSavePdfFile */
export async function deliverPdfBlob(
  input: Blob,
  filename: string
): Promise<PdfDeliveryResult> {
  const pdfBlob =
    input.type === "application/pdf"
      ? input
      : new Blob([input], { type: "application/pdf" });
  const file = new File([pdfBlob], filename, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
  return shareOrSavePdfFile(file);
}
