"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from "react";

const PLACEHOLDER = "/images/rav4.jpg";
const SWIPE_THRESHOLD_PX = 40;
const DIRECTION_LOCK_PX = 8;

/** Mouse / trackpad desktops — independent of viewport width. */
const FINE_POINTER_MQ = "(hover: hover) and (pointer: fine)";

/**
 * Tailwind arbitrary variant for the same media query.
 * Used for visual show/hide so narrow desktop Safari windows stay static.
 */
const FINE_POINTER_ONLY =
  "[@media(hover:hover)_and_(pointer:fine)]:block";
const HIDE_ON_FINE_POINTER =
  "[@media(hover:hover)_and_(pointer:fine)]:hidden";

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
export function uniqueVehicleImages(
  urls: Array<string | null | undefined>
): string[] {
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
 * Hydration-safe fine-pointer detection (null until mounted).
 * Never uses viewport width.
 */
function useIsFinePointer(): boolean | null {
  const [isFinePointer, setIsFinePointer] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER_MQ);
    const sync = () => setIsFinePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isFinePointer;
}

/**
 * Card gallery:
 * - Fine pointer (mouse/trackpad): static cover only — even in a narrow window
 * - Coarse / no-hover (touch): swipe + arrows/dots for multi-image vehicles
 * Image tap never opens a gallery. Behavior is not based on lg/md width.
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
  const coverSrc = resolved[0] ?? PLACEHOLDER;
  const isFinePointer = useIsFinePointer();
  /** Touch carousel active only when we know the device is not fine-pointer. */
  const touchCarouselActive = isFinePointer === false;

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [coverFailed, setCoverFailed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      if (!multi || isFinePointer === true) return;
      const clamped =
        ((next % resolved.length) + resolved.length) % resolved.length;
      setIndex(clamped);
    },
    [multi, resolved.length, isFinePointer]
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  const photosKey = resolved.join("|");
  useEffect(() => {
    setIndex(0);
    setFailed({});
    setCoverFailed(false);
    touchStart.current = null;
    swiped.current = false;
  }, [photosKey]);

  useEffect(() => {
    if (isFinePointer === true) {
      setIndex(0);
      touchStart.current = null;
      swiped.current = false;
    }
  }, [isFinePointer]);

  // Non-passive touchmove — only when touch carousel is active
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !multi || !touchCarouselActive) return;

    const onMove = (e: globalThis.TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (
        Math.abs(dx) > Math.abs(dy) &&
        Math.abs(dx) > DIRECTION_LOCK_PX
      ) {
        swiped.current = true;
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [multi, touchCarouselActive]);

  function onTouchStart(e: TouchEvent) {
    if (!touchCarouselActive) return;
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
    swiped.current = false;
  }

  function onTouchEnd(e: TouchEvent) {
    if (!touchCarouselActive || !touchStart.current || !multi) {
      touchStart.current = null;
      return;
    }
    const t = e.changedTouches[0];
    if (!t) {
      touchStart.current = null;
      return;
    }
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) {
      return;
    }
    swiped.current = true;
    if (dx < 0) next();
    else prev();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!touchCarouselActive || !multi) return;
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

  const showControls = multi && isFinePointer !== true;

  return (
    <div
      className={`relative aspect-[4/3] bg-slate-100 overflow-hidden select-none ${className}`}
    >
      {/* Fine-pointer desktops: static cover (CSS media — not viewport width) */}
      <div
        className={`absolute inset-0 pointer-events-none hidden ${FINE_POINTER_ONLY}`}
        aria-hidden
      >
        <Image
          src={coverFailed ? PLACEHOLDER : coverSrc}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          draggable={false}
          onError={() => setCoverFailed(true)}
        />
      </div>

      {/* Touch / coarse pointer: swipeable carousel (hidden on fine pointer) */}
      <div
        ref={trackRef}
        className={`absolute inset-0 touch-pan-y ${HIDE_ON_FINE_POINTER}`}
        style={{ touchAction: "pan-y" }}
        role="group"
        aria-roledescription={
          touchCarouselActive && multi ? "carousel" : undefined
        }
        aria-label={formatPosition(
          labels.imagePosition,
          index + 1,
          resolved.length
        )}
        tabIndex={touchCarouselActive && multi ? 0 : undefined}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClickCapture={(e) => {
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <Image
            src={srcFor(touchCarouselActive ? index : 0)}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={priority && index === 0}
            loading={priority && index === 0 ? "eager" : "lazy"}
            draggable={false}
            onError={() =>
              setFailed((prev) => ({
                ...prev,
                [touchCarouselActive ? index : 0]: true,
              }))
            }
          />
        </div>

        {touchCarouselActive &&
          multi &&
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

        {showControls && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prev();
              }}
              aria-label={labels.previousImage}
              className={`absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-brand-slate shadow-soft hover:bg-white ${HIDE_ON_FINE_POINTER}`}
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
              aria-label={labels.nextImage}
              className={`absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-brand-slate shadow-soft hover:bg-white ${HIDE_ON_FINE_POINTER}`}
            >
              ›
            </button>

            <div
              className={`pointer-events-none absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5 px-2 ${HIDE_ON_FINE_POINTER}`}
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
