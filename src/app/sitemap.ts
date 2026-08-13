import type { MetadataRoute } from "next";
import { locales } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { absoluteUrl, getSiteUrl, PUBLIC_INDEXABLE_PATHS } from "@/lib/seo";
import { dbGetPublicVehicles } from "@/lib/supabase/vehicle-queries";

/** Refresh when crawled so new/updated public vehicles appear promptly. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isPublicSitemapUrl(url: string, siteOrigin: string): boolean {
  return url.startsWith(`${siteOrigin}/`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const siteOrigin = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  const push = (entry: MetadataRoute.Sitemap[number]) => {
    if (!isPublicSitemapUrl(entry.url, siteOrigin)) return;
    if (seen.has(entry.url)) return;
    seen.add(entry.url);
    entries.push(entry);
  };

  for (const locale of locales) {
    for (const path of PUBLIC_INDEXABLE_PATHS) {
      const isHome = path === "/";
      push({
        url: absoluteUrl(getLocalizedPath(path, locale)),
        lastModified: now,
        changeFrequency: isHome || path === "/inventory" ? "daily" : "weekly",
        priority: isHome ? 1 : path === "/inventory" ? 0.9 : 0.7,
      });
    }
  }

  try {
    // dbGetPublicVehicles already filters status = 在售 (public listings only).
    const vehicles = await dbGetPublicVehicles();
    for (const vehicle of vehicles) {
      const id = vehicle.id?.trim();
      if (!id) continue;

      const lastModified = vehicle.updatedAt
        ? new Date(vehicle.updatedAt)
        : vehicle.createdAt
          ? new Date(vehicle.createdAt)
          : now;

      for (const locale of locales) {
        push({
          url: absoluteUrl(getLocalizedPath(`/inventory/${id}`, locale)),
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
