"use client";

type VehicleImageLoadingOverlayProps = {
  /** Optional localized label; spinner alone is fine if omitted. */
  label?: string;
};

/**
 * Lightweight centered loading state for vehicle gallery switches.
 * Does not change layout size; pointer-events none so arrows stay usable.
 */
export default function VehicleImageLoadingOverlay({
  label,
}: VehicleImageLoadingOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-[5] flex items-center justify-center bg-black/40 pointer-events-none"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="flex flex-col items-center gap-2 rounded-lg bg-black/45 px-3.5 py-2.5 shadow-soft">
        <span
          className="block h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white"
          aria-hidden
        />
        {label ? (
          <span className="text-xs font-medium tracking-wide text-white">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
