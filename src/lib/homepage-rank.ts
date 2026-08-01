import type { Vehicle } from "@/lib/types";

export const HOMEPAGE_RANK_VALUES = [1, 2, 3, 4] as const;
export type HomepageRank = (typeof HOMEPAGE_RANK_VALUES)[number];

export const HOMEPAGE_RANK_ADMIN_OPTIONS: Array<{
  value: HomepageRank;
  label: string;
}> = [
  { value: 1, label: "第1位" },
  { value: 2, label: "第2位" },
  { value: 3, label: "第3位" },
  { value: 4, label: "第4位" },
];

export function isHomepageRank(value: unknown): value is HomepageRank {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (HOMEPAGE_RANK_VALUES as readonly number[]).includes(value)
  );
}

/** Normalize admin form / API homepage recommendation fields. */
export function normalizeHomepageAssignment(input: {
  featured?: boolean | null;
  homepageRank?: number | null;
}): { featured: boolean; homepageRank: HomepageRank | null } {
  const featured = !!input.featured;
  if (!featured) {
    return { featured: false, homepageRank: null };
  }

  const raw = input.homepageRank;
  const rank =
    typeof raw === "number"
      ? raw
      : raw == null || raw === ("" as unknown)
        ? null
        : Number(raw);

  if (!isHomepageRank(rank)) {
    throw new Error("开启首页推荐时请选择首页排序（第1–4位）。");
  }

  return { featured: true, homepageRank: rank };
}

/**
 * Build Popular Models list:
 * 1) homepage-featured vehicles ordered by homepageRank 1→4
 * 2) fill remaining slots with other in-stock vehicles
 */
export function pickHomepageShowcaseVehicles<
  T extends Pick<Vehicle, "id" | "featured" | "homepageRank" | "updatedAt" | "createdAt">,
>(vehicles: T[], limit = 4): T[] {
  const ranked = vehicles
    .filter(
      (v) =>
        v.featured &&
        isHomepageRank(v.homepageRank)
    )
    .sort((a, b) => {
      const ra = a.homepageRank as HomepageRank;
      const rb = b.homepageRank as HomepageRank;
      if (ra !== rb) return ra - rb;
      // Accidental duplicate rank only — prefer newer updated_at
      const ta = a.updatedAt ?? a.createdAt ?? "";
      const tb = b.updatedAt ?? b.createdAt ?? "";
      return tb.localeCompare(ta);
    });

  const result: T[] = [];
  const used = new Set<string>();

  for (const v of ranked) {
    if (result.length >= limit) break;
    if (used.has(v.id)) continue;
    result.push(v);
    used.add(v.id);
  }

  if (result.length < limit) {
    for (const v of vehicles) {
      if (result.length >= limit) break;
      if (used.has(v.id)) continue;
      result.push(v);
      used.add(v.id);
    }
  }

  return result;
}
