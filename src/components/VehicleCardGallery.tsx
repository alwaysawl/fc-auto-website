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
 * Card gallery:
 * - lg+: static primary/cover image only (no arrows, dots, or drag)
 * - below lg: touch swipe + arrows/dots for multi-image vehicles
 * Image tap never opens a gallery.
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

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [coverFailed, setCoverFailed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
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
    setCoverFailed(false);
    touchStart.current = null;
    swiped.current = false;
  }, [photosKey]);

  // Non-passive touchmove so horizontal swipes can call preventDefault (mobile/tablet only)
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !multi) return;

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
  }, [multi]);

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
    swiped.current = false;
  }

  function onTouchEnd(e: TouchEvent) {
    if (!touchStart.current || !multi) {
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
      className={`relative aspect-[4/3] bg-slate-100 overflow-hidden select-none ${className}`}
    >
      {/* Desktop (lg+): static cover only — no carousel interaction */}
      <div className="absolute inset-0 hidden lg:block pointer-events-none" aria-hidden>
        <Image
          src={coverFailed ? PLACEHOLDER : coverSrc}
          alt={alt}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 33vw, 100vw"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          draggable={false}
          onError={() => setCoverFailed(true)}
        />
      </div>

      {/* Mobile / tablet: swipeable carousel (touch only) */}
      <div
        ref={trackRef}
        className="absolute inset-0 lg:hidden touch-pan-y"
        style={{ touchAction: "pan-y" }}
        role="group"
        aria-roledescription={multi ? "carousel" : undefined}
        aria-label={formatPosition(
          labels.imagePosition,
          index + 1,
          resolved.length
        )}
        tabIndex={multi ? 0 : undefined}
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
            src={srcFor(index)}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 1023px) 100vw, 33vw"
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
