"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { Locale } from "@/lib/types";
import { isLocale } from "@/lib/i18n";

/**
 * Records one page_view (and vehicle_detail_view when applicable) per real route change.
 * Skips admin paths and remount duplicates for the same path.
 */
export default function AnalyticsPageTracker({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.includes("/admin")) return;

    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const segments = pathname.split("/").filter(Boolean);
    const pathLocale =
      segments[0] && isLocale(segments[0]) ? segments[0] : locale;
    const rest =
      segments[0] && isLocale(segments[0]) ? segments.slice(1) : segments;

    trackAnalyticsEvent("page_view", {
      locale: pathLocale,
      pagePath: pathname,
      dedupeKey: `page_view|${pathname}`,
    });

    if (rest[0] === "inventory" && rest[1]) {
      const vehicleId = rest[1];
      trackAnalyticsEvent("vehicle_detail_view", {
        locale: pathLocale,
        pagePath: pathname,
        vehicleId,
        dedupeKey: `vehicle_detail_view|${vehicleId}`,
      });
    }
  }, [pathname, locale]);

  return null;
}
