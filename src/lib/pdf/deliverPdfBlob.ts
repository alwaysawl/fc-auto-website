"use client";

/**
 * Cross-platform PDF delivery from an already-in-memory File/Blob.
 *
 * NEVER opens a PDF URL / new tab from the download path.
 * Preview belongs in a separate preview handler only.
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

function triggerAnchorDownload(blob: Blob, filename: string): void {
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
  // Delay revoke so Safari/Chrome can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Share or save a PDF File that is already in memory.
 * Must be called from a direct user gesture on iOS (no await fetch before this).
 *
 * Does NOT call window.open / location.href / router navigation.
 */
export async function shareOrSavePdfFile(
  file: File
): Promise<PdfDeliveryResult> {
  if (canSharePdfFile(file)) {
    try {
      await navigator.share({
        files: [file],
        title: file.name,
      });
      return { method: "share", filename: file.name };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      // Fall through to anchor download when share fails for non-cancel reasons
      // on platforms that support <a download> (desktop / Android).
      if (isAppleMobileBrowser()) {
        throw err instanceof Error
          ? err
          : new Error("系统分享失败，请重试「分享或保存 PDF」");
      }
    }
  }

  if (isAppleMobileBrowser()) {
    throw new Error(
      "当前浏览器无法直接分享文件。请点「分享或保存 PDF」重试，或改用「预览 PDF」后从浏览器分享。"
    );
  }

  const blob =
    file.type === "application/pdf"
      ? file
      : new Blob([file], { type: "application/pdf" });
  triggerAnchorDownload(blob, file.name);
  return { method: "download", filename: file.name };
}

/** @deprecated Use shareOrSavePdfFile — kept for call-site migration. */
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
