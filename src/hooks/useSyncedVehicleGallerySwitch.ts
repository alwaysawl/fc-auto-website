"use client";

import { useCallback, useRef, useState } from "react";
import {
  isVehicleImageReady,
  preloadVehicleImage,
  type VehicleImagePreloadOpts,
} from "@/lib/vehicle-image-cache";

type UseSyncedVehicleGallerySwitchArgs = {
  length: number;
  getSrc: (index: number) => string;
  preloadOpts: VehicleImagePreloadOpts;
  /** When false, navigation is a no-op (e.g. fine-pointer static cover). */
  enabled?: boolean;
  onCommitted?: (index: number) => void;
};

/**
 * Gallery index that only advances when the target image is ready.
 * Rapid clicks update the pending target; stale loads are ignored.
 */
export function useSyncedVehicleGallerySwitch({
  length,
  getSrc,
  preloadOpts,
  enabled = true,
  onCommitted,
}: UseSyncedVehicleGallerySwitchArgs) {
  const [index, setIndex] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);

  const indexRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const onCommittedRef = useRef(onCommitted);
  const getSrcRef = useRef(getSrc);
  const preloadOptsRef = useRef(preloadOpts);

  onCommittedRef.current = onCommitted;
  getSrcRef.current = getSrc;
  preloadOptsRef.current = preloadOpts;
  indexRef.current = index;

  const commit = useCallback((nextIndex: number) => {
    pendingRef.current = null;
    setIsSwitching(false);
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    onCommittedRef.current?.(nextIndex);
  }, []);

  const cancelPending = useCallback(() => {
    requestIdRef.current += 1;
    pendingRef.current = null;
    setIsSwitching(false);
  }, []);

  const reset = useCallback(() => {
    cancelPending();
    indexRef.current = 0;
    setIndex(0);
  }, [cancelPending]);

  const goTo = useCallback(
    async (nextAbsolute: number) => {
      if (!enabled || length <= 1) return;

      const clamped =
        ((nextAbsolute % length) + length) % length;

      // User navigated back to the already-visible frame — drop pending work.
      if (clamped === indexRef.current) {
        cancelPending();
        return;
      }

      // Same pending target already in flight.
      if (pendingRef.current === clamped) return;

      const targetSrc = getSrcRef.current(clamped);

      if (isVehicleImageReady(targetSrc)) {
        // Invalidate any older in-flight request, then commit immediately.
        requestIdRef.current += 1;
        commit(clamped);
        return;
      }

      pendingRef.current = clamped;
      setIsSwitching(true);
      const requestId = ++requestIdRef.current;

      await preloadVehicleImage(targetSrc, preloadOptsRef.current);

      // Stale: user picked a newer target (or cancelled) while this loaded.
      if (requestId !== requestIdRef.current) return;
      if (pendingRef.current !== clamped) return;

      commit(clamped);
    },
    [enabled, length, cancelPending, commit]
  );

  const goRelative = useCallback(
    (delta: number) => {
      const base = pendingRef.current ?? indexRef.current;
      void goTo(base + delta);
    },
    [goTo]
  );

  const jumpTo = useCallback(
    (nextIndex: number) => {
      requestIdRef.current += 1;
      pendingRef.current = null;
      setIsSwitching(false);
      const clamped =
        length <= 0
          ? 0
          : ((nextIndex % length) + length) % length;
      indexRef.current = clamped;
      setIndex(clamped);
    },
    [length]
  );

  return {
    index,
    isSwitching,
    goTo,
    goRelative,
    reset,
    /** Force display index (e.g. fine-pointer mode) without loading UI. */
    jumpTo,
  };
}
