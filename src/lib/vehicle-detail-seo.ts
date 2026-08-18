import type { Locale, Vehicle } from "@/lib/types";
import { driveTypeLabel } from "@/lib/drive-type";
import {
  bodyTypeLabel,
  fuelLabel,
  steeringLabel,
  transmissionLabel,
} from "@/lib/vehicle-field-labels";

/** Short brand for SEO titles (per marketing preference). */
export const SEO_TITLE_BRAND = "FC Auto";

const SITE_NAME = "FC Auto Export";

export type VehicleSeoInput = Pick<
  Vehicle,
  | "id"
  | "year"
  | "brand"
  | "model"
  | "titleEn"
  | "descriptionEn"
  | "mileage"
  | "fuel"
  | "transmission"
  | "steering"
  | "driveType"
  | "displacement"
  | "fobPrice"
  | "currency"
  | "status"
>;

/** Minimal catalog row used only to detect Year+Brand+Model collisions. */
export type VehicleTitleCatalogItem = Pick<
  Vehicle,
  | "id"
  | "year"
  | "brand"
  | "model"
  | "driveType"
  | "displacement"
  | "mileage"
  | "transmission"
>;

function mileageLocale(locale: Locale): string {
  if (locale === "zh") return "zh-CN";
  if (locale === "fr") return "fr-FR";
  return "en-US";
}

export function formatVehicleMileage(locale: Locale, km: number): string {
  return new Intl.NumberFormat(mileageLocale(locale)).format(km);
}

export function yearBrandModel(vehicle: Pick<Vehicle, "year" | "brand" | "model">): string {
  return `${vehicle.year} ${vehicle.brand} ${vehicle.model}`.trim();
}

/**
 * Brand spelling for SEO titles only (DB brand unchanged).
 * "Land Wind" → "Landwind" so Google sees one brand word.
 */
export function seoTitleBrandName(brand: string | undefined | null): string {
  const raw = (brand ?? "").trim();
  if (/^land\s+wind$/i.test(raw)) return "Landwind";
  return raw;
}

export function yearBrandModelForSeoTitle(
  vehicle: Pick<Vehicle, "year" | "brand" | "model">
): string {
  return `${vehicle.year} ${seoTitleBrandName(vehicle.brand)} ${vehicle.model}`.trim();
}

function sameYearBrandModel(
  a: Pick<Vehicle, "year" | "brand" | "model">,
  b: Pick<Vehicle, "year" | "brand" | "model">
): boolean {
  return (
    a.year === b.year &&
    a.brand.trim() === b.brand.trim() &&
    a.model.trim() === b.model.trim()
  );
}

/** Compact LHD/RHD from stored steering. Empty if unknown — never invents a value. */
export function steeringTitleToken(
  steering: string | undefined | null,
  locale: Locale
): string {
  const raw = (steering ?? "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  const isLhd =
    raw === "Left Hand Drive" ||
    raw === "LHD" ||
    raw === "左舵" ||
    key.includes("left");
  const isRhd =
    raw === "Right Hand Drive" ||
    raw === "RHD" ||
    raw === "右舵" ||
    key.includes("right");
  if (isLhd) return locale === "zh" ? "左舵" : "LHD";
  if (isRhd) return locale === "zh" ? "右舵" : "RHD";
  return "";
}

function fieldIsUniqueAmong(
  vehicle: VehicleTitleCatalogItem,
  group: VehicleTitleCatalogItem[],
  read: (v: VehicleTitleCatalogItem) => string
): boolean {
  const mine = read(vehicle);
  if (!mine) return false;
  return group.filter((item) => read(item) === mine).length === 1;
}

/**
 * One customer-facing token when another in-stock vehicle shares Year+Brand+Model.
 * Preference: mileage → drive type → displacement → transmission.
 * Never uses vehicle id / slug / database keys.
 */
export function pickVehicleTitleDisambiguator(
  vehicle: VehicleTitleCatalogItem,
  catalog: VehicleTitleCatalogItem[],
  locale: Locale
): string {
  const siblings = catalog.filter(
    (item) => item.id !== vehicle.id && sameYearBrandModel(item, vehicle)
  );
  if (siblings.length === 0) return "";

  const group = [vehicle, ...siblings];

  if (
    fieldIsUniqueAmong(vehicle, group, (v) =>
      typeof v.mileage === "number" && Number.isFinite(v.mileage)
        ? String(v.mileage)
        : ""
    )
  ) {
    const km = locale === "zh" ? "公里" : "km";
    return `${formatVehicleMileage(locale, vehicle.mileage)} ${km}`;
  }

  const drive = vehicle.driveType?.trim() || "";
  if (fieldIsUniqueAmong(vehicle, group, (v) => v.driveType?.trim() || "")) {
    return drive;
  }

  const engine = vehicle.displacement?.trim() || "";
  if (fieldIsUniqueAmong(vehicle, group, (v) => v.displacement?.trim() || "")) {
    return engine;
  }

  const transmission = vehicle.transmission?.trim() || "";
  if (
    fieldIsUniqueAmong(vehicle, group, (v) => v.transmission?.trim() || "")
  ) {
    return transmission;
  }

  return "";
}

/**
 * SEO title from live vehicle fields.
 * Example: 2016 Landwind X7 LHD Used Car for Sale | FC Auto
 * Model is used as stored; brand display may normalize Land Wind → Landwind.
 */
export function buildVehicleSeoTitle(
  vehicle: VehicleSeoInput,
  locale: Locale,
  catalog: VehicleTitleCatalogItem[] = []
): string {
  const ybm = yearBrandModelForSeoTitle(vehicle);
  const extra = pickVehicleTitleDisambiguator(vehicle, catalog, locale);
  const steering = steeringTitleToken(vehicle.steering, locale);
  const head = [ybm, extra, steering].filter(Boolean).join(" ");

  if (locale === "zh") {
    return `${head} 二手车在售｜${SEO_TITLE_BRAND}`;
  }
  if (locale === "fr") {
    return `${head} voiture d'occasion à vendre | ${SEO_TITLE_BRAND}`;
  }
  return `${head} Used Car for Sale | ${SEO_TITLE_BRAND}`;
}

function capMetaDescription(text: string, max = 160): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function hasMileageKm(vehicle: VehicleSeoInput): boolean {
  return typeof vehicle.mileage === "number" && Number.isFinite(vehicle.mileage);
}

/** Meta description from real vehicle fields only. Unique per listing. */
export function buildVehicleMetaDescription(vehicle: VehicleSeoInput, locale: Locale): string {
  const ybm = yearBrandModelForSeoTitle(vehicle);
  const steer = steeringTitleToken(vehicle.steering, locale);
  const lead = [ybm, steer].filter(Boolean).join(" ");
  const fuel = fuelLabel(vehicle.fuel, locale);
  const transmission = transmissionLabel(vehicle.transmission, locale);
  const mileage = hasMileageKm(vehicle)
    ? formatVehicleMileage(locale, vehicle.mileage)
    : "";

  if (locale === "zh") {
    const facts: string[] = [];
    if (mileage) facts.push(`里程 ${mileage} 公里`);
    if (fuel) facts.push(fuel);
    if (transmission) facts.push(transmission);
    const factText = facts.length > 0 ? `，${facts.join("，")}` : "";
    return capMetaDescription(
      `${lead} 二手车在售${factText}。查看车辆详情并联系 FC Auto，中国二手车出口商。`
    );
  }

  if (locale === "fr") {
    const facts: string[] = [];
    if (mileage) facts.push(`${mileage} km`);
    if (fuel) facts.push(fuel.toLowerCase());
    if (transmission) facts.push(transmission.toLowerCase());
    const withFacts =
      facts.length > 0 ? ` avec ${facts.join(", ")}` : "";
    return capMetaDescription(
      `${lead} voiture d'occasion à vendre${withFacts}. Consultez les détails et contactez FC Auto, exportateur de voitures d'occasion depuis la Chine.`
    );
  }

  const extras: string[] = [];
  if (fuel) extras.push(fuel.toLowerCase());
  if (transmission) extras.push(transmission.toLowerCase());
  const mileageBit = mileage ? ` with ${mileage} km` : "";
  const extraBit = extras.length > 0 ? `, ${extras.join(", ")}` : "";
  return capMetaDescription(
    `${lead} used car for sale${mileageBit}${extraBit}. View details and contact FC Auto, a used car exporter from China.`
  );
}

/** Vehicle Overview fallback — localized field labels, real data only. */
export function buildVehicleOverviewText(
  vehicle: VehicleSeoInput,
  locale: Locale,
  options: { kmUnit: string; fobLabel: string }
): string {
  if (locale === "en" && vehicle.descriptionEn?.trim()) {
    return vehicle.descriptionEn.trim();
  }

  const fuel = fuelLabel(vehicle.fuel, locale);
  const transmission = transmissionLabel(vehicle.transmission, locale);
  const steering = steeringLabel(vehicle.steering, locale);
  const mileage = formatVehicleMileage(locale, vehicle.mileage);
  const currency = vehicle.currency?.trim() || "USD";
  const price = new Intl.NumberFormat(
    mileageLocale(locale),
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(vehicle.fobPrice);

  if (locale === "zh") {
    const specs = [fuel, transmission, steering].filter(Boolean).join("，");
    return `${vehicle.brand} ${vehicle.model}（${vehicle.year}），里程 ${mileage} ${options.kmUnit}，${specs}。${options.fobLabel} ${price}。`;
  }

  if (locale === "fr") {
    const specs = [fuel, transmission, steering].filter(Boolean).join(", ");
    return `${vehicle.brand} ${vehicle.model} (${vehicle.year}) avec ${mileage} km, ${specs}. ${options.fobLabel} ${price}.`;
  }

  const specs = [fuel, transmission, steering].filter(Boolean).join(", ");
  return `${vehicle.brand} ${vehicle.model} (${vehicle.year}) with ${mileage} ${options.kmUnit}, ${specs}. ${options.fobLabel} ${price}.`;
}

/** On-page SEO paragraph — natural prose from real fields. */
export function buildVehicleSeoParagraph(vehicle: VehicleSeoInput, locale: Locale): string {
  const ybm = yearBrandModel(vehicle);
  const mileage = formatVehicleMileage(locale, vehicle.mileage);
  const drive = vehicle.driveType?.trim()
    ? driveTypeLabel(vehicle.driveType, locale)
    : "";
  const engine = vehicle.displacement?.trim() || "";
  const fuel = fuelLabel(vehicle.fuel, locale);
  const transmission = transmissionLabel(vehicle.transmission, locale);
  const steering = steeringLabel(vehicle.steering, locale);

  if (locale === "zh") {
    const traits: string[] = [];
    if (steering) traits.push(steering);
    if (transmission) traits.push(transmission);
    if (engine) traits.push(`${engine}发动机`);
    if (drive) traits.push(drive);
    if (fuel) traits.push(fuel);
    const traitText =
      traits.length > 0 ? `该车为${traits.join("、")}。` : "";
    return `探索这辆由 ${SITE_NAME} 提供的 ${ybm} 中国出口二手车。${traitText}里程约 ${mileage} 公里，面向国际买家、经销商与进口商开放出口。`;
  }

  if (locale === "fr") {
    const traits: string[] = [];
    if (steering) traits.push(steering);
    if (transmission) traits.push(transmission);
    if (engine) traits.push(`moteur ${engine}`);
    if (drive) traits.push(drive);
    if (fuel) traits.push(fuel);
    const traitText =
      traits.length > 0
        ? `Ce véhicule propose ${traits.join(", ")}. `
        : "";
    return `Découvrez ce ${ybm} disponible à l'export depuis la Chine avec ${SITE_NAME}. ${traitText}Environ ${mileage} km au compteur, pour les acheteurs internationaux, concessionnaires et importateurs.`;
  }

  const featureParts: string[] = [];
  if (engine) featureParts.push(`a ${engine} engine`);
  if (drive) featureParts.push(drive.toLowerCase());
  if (fuel) featureParts.push(fuel.toLowerCase());

  let featureSentence = "";
  if (steering && transmission) {
    featureSentence = `This ${steering.toLowerCase()} used vehicle features ${transmission.toLowerCase()} transmission`;
    if (featureParts.length > 0) {
      featureSentence += `, ${featureParts.join(", ")}`;
    }
    featureSentence += ".";
  } else if (steering) {
    featureSentence = `This ${steering.toLowerCase()} used vehicle is listed for export.`;
  } else if (transmission) {
    featureSentence = `This used vehicle features ${transmission.toLowerCase()} transmission.`;
  } else if (featureParts.length > 0) {
    featureSentence = `This used vehicle features ${featureParts.join(", ")}.`;
  }

  const mileagePart = `About ${mileage} km on the odometer.`;
  const audience =
    "Available for international buyers, dealers and importers.";

  return `Explore this ${ybm} available for export from China by ${SITE_NAME}. ${featureSentence} ${mileagePart} ${audience}`.replace(
    /\s+/g,
    " "
  ).trim();
}

/** Natural export-related phrases — varies by brand/model. */
export function buildVehicleExportKeywordPhrases(
  vehicle: Pick<Vehicle, "brand" | "model">,
  locale: Locale
): string[] {
  const bm = `${vehicle.brand} ${vehicle.model}`.trim();

  if (locale === "zh") {
    return [
      `${bm} 中国二手车`,
      `${bm} 出口`,
      `二手${bm}`,
      "中国二手车出口商",
    ];
  }
  if (locale === "fr") {
    return [
      `${bm} d'occasion de Chine`,
      `${bm} à l'export`,
      `${bm} d'occasion à vendre`,
      "Exportateur de voitures d'occasion en Chine",
    ];
  }
  return [
    `Used ${bm} from China`,
    `${bm} for export`,
    `Used ${bm} for sale`,
    "China used car exporter",
  ];
}

/**
 * Detail gallery alt — natural and short.
 * Example: 2016 Landwind X7 used car for sale
 * Extra photos get a photo number only (never invents interior/rear/etc.).
 */
export function vehicleDetailImageAlt(
  vehicle: Pick<Vehicle, "year" | "brand" | "model">,
  locale: Locale,
  photoIndex: number,
  totalPhotos: number
): string {
  const base = yearBrandModelForSeoTitle(vehicle);
  const photoSuffix =
    totalPhotos > 1 && photoIndex > 0
      ? locale === "zh"
        ? `（图 ${photoIndex + 1}）`
        : locale === "fr"
          ? ` (photo ${photoIndex + 1})`
          : ` — photo ${photoIndex + 1}`
      : "";

  if (locale === "zh") {
    return `${base} 二手车在售${photoSuffix}`;
  }
  if (locale === "fr") {
    return `${base} voiture d'occasion à vendre${photoSuffix}`;
  }
  return `${base} used car for sale${photoSuffix}`;
}

/** Inventory list cards — keep simpler alts (non-detail). */
export function vehicleCardImageAlt(
  vehicle: Pick<Vehicle, "year" | "brand" | "model">,
  locale: Locale = "en",
  photoIndex?: number
): string {
  const base = `${vehicle.year} ${vehicle.brand} ${vehicle.model}`;
  if (photoIndex != null && photoIndex > 0) {
    if (locale === "zh") return `${base} 中国出口二手车（图 ${photoIndex}）`;
    if (locale === "fr") return `${base} voiture d'occasion de Chine (photo ${photoIndex})`;
    return `${base} used car from China (photo ${photoIndex})`;
  }
  if (locale === "zh") return `${base} 中国出口二手车`;
  if (locale === "fr") return `${base} voiture d'occasion à l'export depuis la Chine`;
  return `${base} used car for export from China`;
}

export function inventoryBrandFilterHref(brand: string): string {
  return `?brand=${encodeURIComponent(brand)}`;
}
