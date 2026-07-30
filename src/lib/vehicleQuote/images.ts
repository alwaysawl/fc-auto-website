import type { Locale } from "@/lib/types";

const PLACEHOLDER_PATH = "/images/rav4.jpg";

function absolutePublicUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (typeof window === "undefined") return path;
  const base = window.location.origin;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Loaded quote image with intrinsic pixel dimensions for aspect-aware drawing. */
export type QuoteImageAsset = {
  dataUrl: string;
  width: number;
  height: number;
};

/** Load image as JPEG data URL for jsPDF (handles CORS failures gracefully). */
export async function loadImageAsset(
  url: string,
  maxEdge = 1200
): Promise<QuoteImageAsset | null> {
  try {
    const resolved = absolutePublicUrl(url);
    const res = await fetch(resolved, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadHtmlImage(objectUrl);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return {
        dataUrl: canvas.toDataURL("image/jpeg", 0.82),
        width,
        height,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    if (url !== PLACEHOLDER_PATH && !url.includes("rav4.jpg")) {
      return loadImageAsset(PLACEHOLDER_PATH, maxEdge);
    }
    return null;
  }
}

/** @deprecated Prefer loadImageAsset — kept for callers needing only data URL */
export async function loadImageAsDataUrl(
  url: string,
  maxEdge = 1200
): Promise<string | null> {
  const asset = await loadImageAsset(url, maxEdge);
  return asset?.dataUrl ?? null;
}

/** Load a local PNG (e.g. QR) as PNG data URL — avoid JPEG compression artifacts. */
export async function loadPngAsDataUrl(url: string): Promise<string | null> {
  try {
    const resolved = absolutePublicUrl(url);
    const res = await fetch(resolved, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function loadQuoteImages(
  urls: string[],
  maxImages = 4
): Promise<QuoteImageAsset[]> {
  const selected = urls.slice(0, maxImages);
  if (selected.length === 0) {
    const fallback = await loadImageAsset(PLACEHOLDER_PATH);
    return fallback ? [fallback] : [];
  }
  const results: QuoteImageAsset[] = [];
  for (const url of selected) {
    const data = await loadImageAsset(url);
    if (data) results.push(data);
  }
  if (results.length === 0) {
    const fallback = await loadImageAsset(PLACEHOLDER_PATH);
    if (fallback) results.push(fallback);
  }
  return results;
}

/** Render Unicode text to a PNG data URL using browser fonts (CJK-safe). */
export function renderTextBitmap(
  text: string,
  opts: {
    fontSize: number;
    color?: string;
    fontWeight?: string;
    maxWidth?: number;
    align?: CanvasTextAlign;
    locale?: Locale;
  }
): { dataUrl: string; width: number; height: number } {
  const fontFamily =
    opts.locale === "zh"
      ? '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif'
      : 'Helvetica,Arial,"Segoe UI",sans-serif';
  const weight = opts.fontWeight ?? "400";
  const color = opts.color ?? "#0f172a";
  const fontSize = opts.fontSize;
  const maxWidth = opts.maxWidth ?? 800;
  const align = opts.align ?? "left";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: "", width: 0, height: 0 };
  }

  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
  const lines = wrapLines(ctx, text, maxWidth);
  const lineHeight = Math.ceil(fontSize * 1.35);
  const width = Math.ceil(
    Math.min(
      maxWidth,
      Math.max(...lines.map((l) => ctx.measureText(l).width), 1)
    ) + 4
  );
  const height = Math.ceil(lines.length * lineHeight + 4);
  canvas.width = width;
  canvas.height = height;

  const ctx2 = canvas.getContext("2d");
  if (!ctx2) {
    return { dataUrl: "", width: 0, height: 0 };
  }
  ctx2.font = `${weight} ${fontSize}px ${fontFamily}`;
  ctx2.fillStyle = color;
  ctx2.textBaseline = "top";
  ctx2.textAlign = align;
  const x = align === "center" ? width / 2 : align === "right" ? width - 2 : 2;
  lines.forEach((line, i) => {
    ctx2.fillText(line, x, 2 + i * lineHeight);
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
  };
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      lines.push("");
      continue;
    }
    // Prefer wrapping on spaces; for CJK wrap by character
    if (/\s/.test(para) && !/[\u4e00-\u9fff]/.test(para)) {
      const words = para.split(/\s+/);
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    } else {
      let current = "";
      for (const ch of para) {
        const test = current + ch;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = ch;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
  }
  return lines.length ? lines : [""];
}
