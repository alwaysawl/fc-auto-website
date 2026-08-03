/**
 * Load and register Noto Sans SC (TTF) into jsPDF for true vector bilingual text.
 * Fonts live in /public/fonts and are embedded into each generated PDF.
 */

import type { jsPDF } from "jspdf";

export const PROFORMA_FONT_FAMILY = "NotoSansSC";

type FontCache = {
  regularBase64: string;
  boldBase64: string;
};

let cache: FontCache | null = null;
let loading: Promise<FontCache> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchFontBase64(path: string): Promise<string> {
  const res = await fetch(path, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`无法加载字体文件：${path}`);
  }
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function loadProformaFontData(): Promise<FontCache> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      const [regularBase64, boldBase64] = await Promise.all([
        fetchFontBase64("/fonts/NotoSansSC-Regular.ttf"),
        fetchFontBase64("/fonts/NotoSansSC-Bold.ttf"),
      ]);
      cache = { regularBase64, boldBase64 };
      return cache;
    })().catch((err) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

/** Register embedded Noto Sans SC on a jsPDF document (vector text, CJK-safe). */
export async function ensureProformaFonts(doc: jsPDF): Promise<void> {
  const data = await loadProformaFontData();
  doc.addFileToVFS("NotoSansSC-Regular.ttf", data.regularBase64);
  doc.addFileToVFS("NotoSansSC-Bold.ttf", data.boldBase64);
  doc.addFont("NotoSansSC-Regular.ttf", PROFORMA_FONT_FAMILY, "normal");
  doc.addFont("NotoSansSC-Bold.ttf", PROFORMA_FONT_FAMILY, "bold");
  doc.setFont(PROFORMA_FONT_FAMILY, "normal");
}

export function setProformaFont(
  doc: jsPDF,
  style: "normal" | "bold" = "normal"
): void {
  doc.setFont(PROFORMA_FONT_FAMILY, style);
}
