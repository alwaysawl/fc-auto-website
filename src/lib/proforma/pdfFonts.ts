/**
 * Load and register Noto Sans SC (TTF) into jsPDF for true vector bilingual text.
 *
 * Fonts live at public/fonts/NotoSansSC-{Regular,Bold}.ttf (exact names, case-sensitive).
 * On Vercel these must be included via next.config outputFileTracingIncludes —
 * public/ is not automatically present under /var/task for serverless functions.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { jsPDF } from "jspdf";

export const PROFORMA_FONT_FAMILY = "NotoSansSC";

/** Exact on-disk filenames under public/fonts (Linux/Vercel paths are case-sensitive). */
export const PROFORMA_FONT_FILES = {
  regular: "NotoSansSC-Regular.ttf",
  bold: "NotoSansSC-Bold.ttf",
} as const;

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

function bufferToBase64(buf: Buffer): string {
  return buf.toString("base64");
}

/**
 * Resolve a font file from the project root without hardcoding /var/task.
 * Primary path: path.join(process.cwd(), 'public', 'fonts', filename)
 */
export function resolveProformaFontPath(filename: string): {
  path: string;
  exists: boolean;
  cwd: string;
  candidates: string[];
} {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "public", "fonts", filename),
    // Fallback if tracing copies fonts next to cwd/fonts
    join(cwd, "fonts", filename),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { path: candidate, exists: true, cwd, candidates };
    }
  }

  return {
    path: candidates[0],
    exists: false,
    cwd,
    candidates,
  };
}

function readFontFileBase64(filename: string): string {
  const resolved = resolveProformaFontPath(filename);

  // Temporary diagnostics for Vercel (cwd + path + exists).
  console.info("[proforma-fonts]", {
    cwd: resolved.cwd,
    filename,
    resolvedPath: resolved.path,
    exists: resolved.exists,
    candidates: resolved.candidates,
  });

  if (!resolved.exists) {
    throw new Error(
      `中文字体文件缺失，无法生成 PDF。` +
        ` 未找到 ${filename}。` +
        ` cwd=${resolved.cwd}` +
        ` tried=${resolved.candidates.join(" | ")}` +
        `。请确认 public/fonts/${filename} 已提交，且 next.config 的 outputFileTracingIncludes 包含该字体。`
    );
  }

  return bufferToBase64(readFileSync(resolved.path));
}

async function fetchFontBase64FromPublicUrl(publicPath: string): Promise<string> {
  const res = await fetch(publicPath, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`无法加载字体文件：${publicPath}`);
  }
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function loadProformaFontData(): Promise<FontCache> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      // Server: always read from the local filesystem (never browser URLs).
      // Browser (if ever used): load from the static /fonts public URL.
      let regularBase64: string;
      let boldBase64: string;

      if (typeof window === "undefined") {
        regularBase64 = readFontFileBase64(PROFORMA_FONT_FILES.regular);
        boldBase64 = readFontFileBase64(PROFORMA_FONT_FILES.bold);
      } else {
        regularBase64 = await fetchFontBase64FromPublicUrl(
          `/fonts/${PROFORMA_FONT_FILES.regular}`
        );
        boldBase64 = await fetchFontBase64FromPublicUrl(
          `/fonts/${PROFORMA_FONT_FILES.bold}`
        );
      }

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
  doc.addFileToVFS(PROFORMA_FONT_FILES.regular, data.regularBase64);
  doc.addFileToVFS(PROFORMA_FONT_FILES.bold, data.boldBase64);
  doc.addFont(PROFORMA_FONT_FILES.regular, PROFORMA_FONT_FAMILY, "normal");
  doc.addFont(PROFORMA_FONT_FILES.bold, PROFORMA_FONT_FAMILY, "bold");
  doc.setFont(PROFORMA_FONT_FAMILY, "normal");
}

export function setProformaFont(
  doc: jsPDF,
  style: "normal" | "bold" = "normal"
): void {
  doc.setFont(PROFORMA_FONT_FAMILY, style);
}
