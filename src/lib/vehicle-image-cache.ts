/**
 * Lightweight vehicle-image warm cache + ahead preload.
 *
 * Preloads the same `/_next/image` URL the visible next/image will use,
 * so browser/CDN cache hits on swipe. At most {@link VEHICLE_IMAGE_PRELOAD_AHEAD}
 * images ahead of the current index (never the whole gallery at once).
 */

import { getImageProps } from "next/image";

/** How many upcoming gallery frames to warm after the current one is ready. */
export const VEHICLE_IMAGE_PRELOAD_AHEAD = 1;

/**
 * Inventory / Latest / similar cards.
 * Breakpoints match Tailwind md (768) / xl (1280) grids:
 * 1 col below 768, 2 col until 1280, ~400px slot at 3 col.
 * Using 767/1279 avoids the inclusive 768px 92vw miss that requested w=1600 for 2-col cards.
 */
export const VEHICLE_CARD_IMAGE = {
  sizes: "(max-width: 767px) 92vw, (max-width: 1279px) 45vw, 400px",
  quality: 75,
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
 * Upcoming gallery indices relative to `current` (circular), capped at `ahead`.
 * Never includes `current`; never returns more than `total - 1` entries.
 */
export function aheadGalleryIndices(
  current: number,
  total: number,
  ahead: number = VEHICLE_IMAGE_PRELOAD_AHEAD
): number[] {
  if (total <= 1 || ahead <= 0) return [];
  const out: number[] = [];
  const max = Math.min(ahead, total - 1);
  for (let step = 1; step <= max; step++) {
    const idx = (current + step) % total;
    if (idx === current || out.includes(idx)) break;
    out.push(idx);
  }
  return out;
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

/**
 * Warm up to {@link VEHICLE_IMAGE_PRELOAD_AHEAD} upcoming frames.
 * Skips URLs already ready or already in flight (no duplicate network work).
 */
export function preloadVehicleImagesAhead(
  currentIndex: number,
  sources: Array<string | null | undefined>,
  opts: VehicleImagePreloadOpts,
  ahead: number = VEHICLE_IMAGE_PRELOAD_AHEAD
): void {
  for (const idx of aheadGalleryIndices(currentIndex, sources.length, ahead)) {
    void preloadVehicleImage(sources[idx], opts);
  }
}
