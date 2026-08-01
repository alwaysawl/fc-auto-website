import type { Vehicle } from "@/lib/types";

/** Max vehicles shown on homepage Popular Models / allowed as featured. */
export const HOMEPAGE_SHOWCASE_LIMIT = 4;

export const HOMEPAGE_MAX_FEATURED_MESSAGE =
  "首页最多展示4台推荐车辆，请先移除一台。";

export const HOMEPAGE_RANK_VALUES = [1, 2, 3, 4] as const;
export type HomepageRank = (typeof HOMEPAGE_RANK_VALUES)[number];

export function isHomepageRank(value: unknown): value is HomepageRank {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (HOMEPAGE_RANK_VALUES as readonly number[]).includes(value)
  );
}

/**
 * Homepage Popular Models: featured only, sorted by homepage_rank ASC, max 4.
 */
export function pickHomepageShowcaseVehicles<
  T extends Pick<Vehicle, "id" | "featured" | "homepageRank" | "updatedAt" | "createdAt">,
>(vehicles: T[], limit = HOMEPAGE_SHOWCASE_LIMIT): T[] {
  return vehicles
    .filter((v) => v.featured)
    .sort((a, b) => {
      const ra = a.homepageRank ?? Number.POSITIVE_INFINITY;
      const rb = b.homepageRank ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) return ra - rb;
      const ta = a.updatedAt ?? a.createdAt ?? "";
      const tb = b.updatedAt ?? b.createdAt ?? "";
      return tb.localeCompare(ta);
    })
    .slice(0, limit);
}

/** Sort featured vehicles for the admin drag list (rank ASC). */
export function sortFeaturedForAdmin<
  T extends Pick<Vehicle, "homepageRank" | "updatedAt" | "createdAt">,
>(vehicles: T[]): T[] {
  return [...vehicles].sort((a, b) => {
    const ra = a.homepageRank ?? Number.POSITIVE_INFINITY;
    const rb = b.homepageRank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    const ta = a.updatedAt ?? a.createdAt ?? "";
    const tb = b.updatedAt ?? b.createdAt ?? "";
    return tb.localeCompare(ta);
  });
}
