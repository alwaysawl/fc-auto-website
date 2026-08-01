import type { Locale } from "@/lib/types";

/** Canonical drive_type values stored in the database. */
export const DRIVE_TYPE_VALUES = ["FWD", "RWD", "2WD", "4WD", "AWD"] as const;
export type DriveTypeValue = (typeof DRIVE_TYPE_VALUES)[number];

/** Admin panel labels (Chinese). */
export const DRIVE_TYPE_ADMIN_OPTIONS: Array<{
  value: DriveTypeValue;
  label: string;
}> = [
  { value: "FWD", label: "前驱" },
  { value: "RWD", label: "后驱" },
  { value: "2WD", label: "两驱" },
  { value: "4WD", label: "四驱" },
  { value: "AWD", label: "全时四驱" },
];

const DRIVE_TYPE_LABELS: Record<
  DriveTypeValue,
  { en: string; fr: string; zh: string }
> = {
  FWD: {
    en: "Front Wheel Drive",
    fr: "Traction Avant",
    zh: "前驱",
  },
  RWD: {
    en: "Rear Wheel Drive",
    fr: "Propulsion",
    zh: "后驱",
  },
  "2WD": {
    en: "Two Wheel Drive",
    fr: "Deux Roues Motrices",
    zh: "两驱",
  },
  "4WD": {
    en: "Four Wheel Drive",
    fr: "Quatre Roues Motrices",
    zh: "四驱",
  },
  AWD: {
    en: "All Wheel Drive",
    fr: "Transmission Intégrale",
    zh: "全时四驱",
  },
};

export function isDriveTypeValue(value: string): value is DriveTypeValue {
  return (DRIVE_TYPE_VALUES as readonly string[]).includes(value);
}

/** Localized display label for a stored drive_type value. Empty if unset. */
export function driveTypeLabel(
  value: string | undefined | null,
  locale: Locale
): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (!isDriveTypeValue(raw)) return raw;
  const item = DRIVE_TYPE_LABELS[raw];
  if (locale === "fr") return item.fr;
  if (locale === "zh") return item.zh;
  return item.en;
}
