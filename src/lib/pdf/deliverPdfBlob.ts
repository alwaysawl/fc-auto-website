"use client";

/**
 * Cross-platform PDF delivery from an already-in-memory File/Blob.
 *
 * NEVER opens a PDF URL / new tab from the download path.
 * NEVER uses showSaveFilePicker / showOpenFilePicker / file inputs.
 * NEVER shares text/url/title (iOS Save-to-Files would create「文本 N」junk).
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
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Share or save a PDF File that is already in memory.
 *
 * Web Share: ONLY `{ files: [file] }` — no title/text/url.
 * After successful share, returns immediately (no download fallback).
 */
export async function shareOrSavePdfFile(
  file: File
): Promise<PdfDeliveryResult> {
  if (file.type !== "application/pdf" || !file.size) {
    throw new Error("只能分享有效的 PDF 文件");
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (
    typeof navigator.share === "function" &&
    typeof nav.canShare === "function" &&
    nav.canShare({ files: [file] })
  ) {
    try {
      // files only — title/text create iOS「文本 N」45-byte junk files.
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
      // Non-Apple: fall through to anchor download only when share failed.
    }
  } else if (isAppleMobileBrowser()) {
    throw new Error(
      "当前浏览器不支持直接分享 PDF，请使用 Safari 打开。"
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
