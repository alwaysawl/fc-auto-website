import type { MetadataRoute } from "next";
import { locales } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { absoluteUrl, PUBLIC_INDEXABLE_PATHS } from "@/lib/seo";
import { dbGetPublicVehicles } from "@/lib/supabase/vehicle-queries";

/** Refresh when crawled so new/updated public vehicles appear promptly. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of PUBLIC_INDEXABLE_PATHS) {
      const isHome = path === "/";
      entries.push({
        url: absoluteUrl(getLocalizedPath(path, locale)),
        lastModified: now,
        changeFrequency: isHome || path === "/inventory" ? "daily" : "weekly",
        priority: isHome ? 1 : path === "/inventory" ? 0.9 : 0.7,
      });
    }
  }

  try {
    const vehicles = await dbGetPublicVehicles();
    for (const vehicle of vehicles) {
      const lastModified = vehicle.updatedAt
        ? new Date(vehicle.updatedAt)
        : vehicle.createdAt
          ? new Date(vehicle.createdAt)
          : now;

      for (const locale of locales) {
        entries.push({
          url: absoluteUrl(getLocalizedPath(`/inventory/${vehicle.id}`, locale)),
          lastModified,
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    console.error(
      "[sitemap] Failed to load public vehicles:",
      err instanceof Error ? err.message : err
    );
  }

  return entries;
}
