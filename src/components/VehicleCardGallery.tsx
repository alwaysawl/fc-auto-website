"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from "react";

const PLACEHOLDER = "/images/rav4.jpg";

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

function uniqueImages(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw?.trim();
    if (!u || u.startsWith("blob:") || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out.length > 0 ? out : [PLACEHOLDER];
}

function formatPosition(template: string, current: number, total: number) {
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

/**
 * Swipeable card gallery — image tap does nothing; only View Details opens detail.
 */
export default function VehicleCardGallery({
  images,
  alt,
  labels,
  priority = false,
  className = "",
}: VehicleCardGalleryProps) {
  const photos = uniqueImages(images);
  const multi = photos.length > 1;
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      if (!multi) return;
      const clamped = ((next % photos.length) + photos.length) % photos.length;
      setIndex(clamped);
    },
    [multi, photos.length]
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    setIndex(0);
    setFailed({});
  }, [photos.join("|")]);

  // Non-passive touchmove so horizontal swipes can call preventDefault
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !multi) return;

    const onMove = (e: globalThis.TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
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
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
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
    return failed[i] ? PLACEHOLDER : photos[i] ?? PLACEHOLDER;
  }

  return (
    <div
      ref={trackRef}
      className={`relative aspect-[4/3] bg-slate-100 overflow-hidden select-none ${className}`}
      style={{ touchAction: "pan-y" }}
      role="group"
      aria-roledescription="carousel"
      aria-label={formatPosition(labels.imagePosition, index + 1, photos.length)}
      tabIndex={multi ? 0 : undefined}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClickCapture={(e) => {
        // After a swipe, block any accidental click/navigation
        if (swiped.current) {
          e.preventDefault();
          e.stopPropagation();
          swiped.current = false;
        }
      }}
    >
      {/* Non-interactive image plane — tap does nothing */}
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

      {/* Preload adjacent images lazily via hidden imgs once user navigates */}
      {multi &&
        photos.map((url, i) =>
          i === index || Math.abs(i - index) > 1 ? null : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url + i}
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
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/90 text-brand-slate shadow-soft hover:bg-white transition-colors"
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
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/90 text-brand-slate shadow-soft hover:bg-white transition-colors"
          >
            ›
          </button>

          <div
            className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5 px-2 pointer-events-none"
            role="tablist"
            aria-label={formatPosition(labels.imagePosition, index + 1, photos.length)}
          >
            {photos.map((_, i) => (
              <span
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={formatPosition(labels.imagePosition, i + 1, photos.length)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-4 bg-accent-yellow shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                    : "w-1.5 bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Collect ordered unique photo URLs for a vehicle card gallery. */
export function collectVehicleCardImages(vehicle: {
  mainImageUrl?: string | null;
  galleryImageUrls?: string[] | null;
  photos?: string[] | null;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url?: string | null) => {
    const u = url?.trim();
    if (!u || u.startsWith("blob:") || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  push(vehicle.mainImageUrl);
  for (const u of vehicle.galleryImageUrls ?? []) push(u);
  for (const u of vehicle.photos ?? []) push(u);
  return out;
}
