/**
 * Lightweight vehicle-image warm cache + single-ahead preload.
 *
 * Preloads the same `/_next/image` URL the visible next/image will use,
 * so browser/CDN cache hits on swipe. Never preloads more than one image ahead.
 */

import { getImageProps } from "next/image";

/** Inventory / card carousel — ~800–1200px class display. */
export const VEHICLE_CARD_IMAGE = {
  sizes: "(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 400px",
  quality: 70,
  width: 1200,
  height: 900,
} as const;

/** Vehicle detail main photo — ~1200–1600px class display. */
export const VEHICLE_DETAIL_IMAGE = {
  sizes: "(max-width: 1024px) 100vw, 65vw",
  quality: 75,
  width: 1600,
  height: 1200,
} as const;

export type VehicleImagePreloadOpts = {
  sizes: string;
  width: number;
  height: number;
  quality?: number;
};

/** Stable source URLs that have finished loading (display or preload). */
const readySources = new Set<string>();
/** In-flight preload promises keyed by stable source URL. */
const inflight = new Map<string, Promise<void>>();

export function markVehicleImageReady(src: string | null | undefined): void {
  const url = src?.trim();
  if (!url || url.startsWith("blob:")) return;
  readySources.add(url);
}

export function isVehicleImageReady(src: string | null | undefined): boolean {
  const url = src?.trim();
  if (!url) return false;
  return readySources.has(url);
}

export function nextGalleryIndex(current: number, total: number): number {
  if (total <= 1) return 0;
  return (current + 1) % total;
}

/**
 * Warm exactly one optimized variant for `src` (same pipeline as next/image).
 * No-ops if already ready or a preload is already in flight for this URL.
 */
export function preloadVehicleImage(
  src: string | null | undefined,
  opts: VehicleImagePreloadOpts
): Promise<void> {
  const url = src?.trim();
  if (!url || url.startsWith("blob:")) return Promise.resolve();
  if (readySources.has(url)) return Promise.resolve();

  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const finish = () => {
      readySources.add(url);
      inflight.delete(url);
      resolve();
    };
    const fail = () => {
      inflight.delete(url);
      resolve();
    };

    if (typeof window === "undefined") {
      fail();
      return;
    }

    try {
      const { props } = getImageProps({
        src: url,
        alt: "",
        width: opts.width,
        height: opts.height,
        sizes: opts.sizes,
        quality: opts.quality ?? 75,
      });

      const img = new window.Image();
      img.decoding = "async";
      img.onload = finish;
      img.onerror = fail;
      if (props.srcSet) img.srcset = props.srcSet;
      if (props.sizes) img.sizes = props.sizes;
      img.src = props.src;
    } catch {
      // Local/misconfigured hosts: fall back to the stable source URL once.
      const img = new window.Image();
      img.decoding = "async";
      img.onload = finish;
      img.onerror = fail;
      img.src = url;
    }
  });

  inflight.set(url, promise);
  return promise;
}
