import type { Locale } from "@/lib/types";

type LabelMap = Record<string, { en: string; fr: string; zh: string }>;

const FUEL_LABELS: LabelMap = {
  Petrol: { en: "Petrol", fr: "Essence", zh: "汽油" },
  Diesel: { en: "Diesel", fr: "Diesel", zh: "柴油" },
  Hybrid: { en: "Hybrid", fr: "Hybride", zh: "混合动力" },
  Electric: { en: "Electric", fr: "Électrique", zh: "纯电动" },
  LPG: { en: "LPG", fr: "GPL", zh: "液化石油气" },
};

const TRANSMISSION_LABELS: LabelMap = {
  Automatic: { en: "Automatic", fr: "Automatique", zh: "自动挡" },
  Manual: { en: "Manual", fr: "Manuelle", zh: "手动挡" },
  CVT: { en: "CVT", fr: "CVT", zh: "CVT 无级变速" },
  "Semi-Automatic": {
    en: "Semi-Automatic",
    fr: "Semi-automatique",
    zh: "半自动挡",
  },
};

const STEERING_LABELS: LabelMap = {
  "Left Hand Drive": {
    en: "Left Hand Drive",
    fr: "Conduite à gauche",
    zh: "左舵",
  },
  "Right Hand Drive": {
    en: "Right Hand Drive",
    fr: "Conduite à droite",
    zh: "右舵",
  },
};

const BODY_TYPE_LABELS: LabelMap = {
  SUV: { en: "SUV", fr: "SUV", zh: "SUV" },
  Sedan: { en: "Sedan", fr: "Berline", zh: "轿车" },
  Pickup: { en: "Pickup", fr: "Pick-up", zh: "皮卡" },
  Minivan: { en: "Minivan", fr: "Monospace", zh: "MPV" },
  Van: { en: "Van", fr: "Fourgon", zh: "厢式车" },
  Other: { en: "Other", fr: "Autre", zh: "其他" },
};

const COLOR_LABELS: LabelMap = {
  白色: { en: "White", fr: "Blanc", zh: "白色" },
  黑色: { en: "Black", fr: "Noir", zh: "黑色" },
  银色: { en: "Silver", fr: "Argent", zh: "银色" },
  灰色: { en: "Gray", fr: "Gris", zh: "灰色" },
  红色: { en: "Red", fr: "Rouge", zh: "红色" },
  蓝色: { en: "Blue", fr: "Bleu", zh: "蓝色" },
  绿色: { en: "Green", fr: "Vert", zh: "绿色" },
  黄色: { en: "Yellow", fr: "Jaune", zh: "黄色" },
  棕色: { en: "Brown", fr: "Marron", zh: "棕色" },
  金色: { en: "Gold", fr: "Or", zh: "金色" },
};

function pickLabel(
  map: LabelMap,
  value: string | undefined | null,
  locale: Locale
): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const item = map[raw];
  if (!item) return raw;
  if (locale === "fr") return item.fr;
  if (locale === "zh") return item.zh;
  return item.en;
}

export function fuelLabel(value: string | undefined | null, locale: Locale): string {
  return pickLabel(FUEL_LABELS, value, locale);
}

export function transmissionLabel(
  value: string | undefined | null,
  locale: Locale
): string {
  return pickLabel(TRANSMISSION_LABELS, value, locale);
}

export function steeringLabel(value: string | undefined | null, locale: Locale): string {
  return pickLabel(STEERING_LABELS, value, locale);
}

export function bodyTypeLabel(value: string | undefined | null, locale: Locale): string {
  return pickLabel(BODY_TYPE_LABELS, value, locale);
}

/** Map stored Chinese color names (白色, 黑色, …) to the page/PDF locale. */
export function colorLabel(value: string | undefined | null, locale: Locale): string {
  return pickLabel(COLOR_LABELS, value, locale);
}
