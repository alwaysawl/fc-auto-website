"use client";

/**
 * Cross-platform PDF delivery from an already-fetched Blob.
 *
 * Download path rules:
 * - Never treat opening a PDF URL as a successful download.
 * - iPhone/iPad: Web Share API with files (Save to Files / WhatsApp / …).
 * - Desktop + Android: temporary <a download> on a Blob URL.
 * - iOS Share unavailable: Blob new-tab fallback + explicit user instruction.
 */

export type PdfDeliveryMethod = "share" | "download" | "ios-fallback";

export type PdfDeliveryResult = {
  method: PdfDeliveryMethod;
  filename: string;
  /** Present for ios-fallback — not a successful direct download. */
  message?: string;
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

async function tryNativeFileShare(
  file: File
): Promise<"shared" | "cancelled" | "unavailable"> {
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

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke so Safari/Chrome can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_500);
}

/**
 * Deliver a PDF Blob to the user without navigating the current page.
 */
export async function deliverPdfBlob(
  input: Blob,
  filename: string
): Promise<PdfDeliveryResult> {
  const pdfBlob =
    input.type === "application/pdf"
      ? input
      : new Blob([input], { type: "application/pdf" });
  const file = new File([pdfBlob], filename, { type: "application/pdf" });

  if (isAppleMobileBrowser()) {
    const shareResult = await tryNativeFileShare(file);
    if (shareResult === "shared") {
      return { method: "share", filename };
    }
    if (shareResult === "cancelled") {
      const cancel = new Error("已取消分享");
      cancel.name = "AbortError";
      throw cancel;
    }

    // Share with files unavailable — open Blob preview and instruct the user.
    // This is NOT reported as a successful download.
    const url = URL.createObjectURL(pdfBlob);
    const opened = window.open(url, "_blank");
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    if (!opened) {
      URL.revokeObjectURL(url);
      throw new Error(
        "无法打开 PDF。请允许弹窗后重试，或长按使用浏览器分享。"
      );
    }
    return {
      method: "ios-fallback",
      filename,
      message: "请点击浏览器分享按钮，然后选择「存储到文件」",
    };
  }

  // Desktop Chrome/Safari/Edge and Android Chrome: Blob + <a download>.
  triggerAnchorDownload(pdfBlob, filename);
  return { method: "download", filename };
}
