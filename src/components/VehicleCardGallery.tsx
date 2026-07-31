"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const PLACEHOLDER = "/images/rav4.jpg";
const SWIPE_THRESHOLD_PX = 40;
const DIRECTION_LOCK_PX = 8;

export type VehicleCardGalleryLabels = {
  previousImage: string;
  nextImage: string;
  imagePosition: string; // "Image {current} of {total}"
};

type VehicleCardGalleryProps = {
  images: string[];
  alt: string;
  labels: VehicleCardGalleryLabels;
  /** Eager-load the first image (above-the-fold cards) */
  priority?: boolean;
  className?: string;
};

/** Ordered unique valid image URLs (no blob:, no empties, no duplicates). */
export function uniqueVehicleImages(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw?.trim();
    if (!u || u.startsWith("blob:") || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function formatPosition(template: string, current: number, total: number) {
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

/**
 * Swipeable card gallery — image tap does nothing; only View Details opens detail.
 * Each instance keeps its own active index (never shared across cards).
 */
export default function VehicleCardGallery({
  images,
  alt,
  labels,
  priority = false,
  className = "",
}: VehicleCardGalleryProps) {
  const photos = uniqueVehicleImages(images);
  const resolved = photos.length > 0 ? photos : [PLACEHOLDER];
  const multi = resolved.length > 1;
  const reactId = useId();

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(
    null
  );
  const axisLock = useRef<"x" | "y" | null>(null);
  const swiped = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      if (!multi) return;
      const clamped =
        ((next % resolved.length) + resolved.length) % resolved.length;
      setIndex(clamped);
    },
    [multi, resolved.length]
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  const photosKey = resolved.join("|");
  useEffect(() => {
    setIndex(0);
    setFailed({});
    pointerStart.current = null;
    axisLock.current = null;
    swiped.current = false;
  }, [photosKey]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!multi || e.button !== 0) return;
    // Ignore controls (buttons)
    if ((e.target as HTMLElement | null)?.closest?.("button")) return;
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    axisLock.current = null;
    swiped.current = false;
    try {
      rootRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!multi || !pointerStart.current) return;
    if (pointerStart.current.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;

    if (!axisLock.current) {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) {
        return;
      }
      axisLock.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    if (axisLock.current === "x") {
      swiped.current = true;
      // Prevent the page from treating this as a click target drag
      e.preventDefault();
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) {
      pointerStart.current = null;
      axisLock.current = null;
      return;
    }
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    const locked = axisLock.current;
    pointerStart.current = null;
    axisLock.current = null;

    try {
      rootRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (!multi || locked !== "x") return;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) {
      return;
    }
    swiped.current = true;
    if (dx < 0) next();
    else prev();
  }

  function onPointerCancel() {
    pointerStart.current = null;
    axisLock.current = null;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!multi) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  }

  function srcFor(i: number) {
    return failed[i] ? PLACEHOLDER : resolved[i] ?? PLACEHOLDER;
  }

  return (
    <div
      ref={rootRef}
      className={`relative aspect-[4/3] bg-slate-100 overflow-hidden select-none touch-pan-y ${className}`}
      role="group"
      aria-roledescription={multi ? "carousel" : undefined}
      aria-label={formatPosition(labels.imagePosition, index + 1, resolved.length)}
      tabIndex={multi ? 0 : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={(e) => {
        if (swiped.current) {
          e.preventDefault();
          e.stopPropagation();
          swiped.current = false;
        }
      }}
    >
      {/* Non-interactive image plane — tap does not open a gallery */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <Image
          src={srcFor(index)}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          priority={priority && index === 0}
          loading={priority && index === 0 ? "eager" : "lazy"}
          draggable={false}
          onError={() => setFailed((prev) => ({ ...prev, [index]: true }))}
        />
      </div>

      {multi &&
        resolved.map((url, i) =>
          i === index || Math.abs(i - index) > 1 ? null : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${reactId}-preload-${i}`}
              src={url}
              alt=""
              className="hidden"
              loading="lazy"
              onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
            />
          )
        )}

      {multi && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prev();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={labels.previousImage}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-brand-slate shadow-soft hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              next();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={labels.nextImage}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-brand-slate shadow-soft hover:bg-white"
          >
            ›
          </button>

          <div
            className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5 px-2"
            role="tablist"
            aria-label={formatPosition(
              labels.imagePosition,
              index + 1,
              resolved.length
            )}
          >
            {resolved.map((_, i) => (
              <span
                key={`${reactId}-dot-${i}`}
                role="tab"
                aria-selected={i === index}
                aria-label={formatPosition(
                  labels.imagePosition,
                  i + 1,
                  resolved.length
                )}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-4 bg-accent-yellow shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                    : "w-1.5 bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Collect ordered unique photo URLs for a vehicle card gallery.
 * Prefer hydrated photos[] (from withPublicPhotos), then main + gallery arrays.
 */
export function collectVehicleCardImages(vehicle: {
  mainImageUrl?: string | null;
  galleryImageUrls?: string[] | null;
  photos?: string[] | null;
}): string[] {
  return uniqueVehicleImages([
    vehicle.mainImageUrl,
    ...(vehicle.galleryImageUrls ?? []),
    ...(vehicle.photos ?? []),
  ]);
}
