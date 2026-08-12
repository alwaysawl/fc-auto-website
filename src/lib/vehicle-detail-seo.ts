import type { Locale, Vehicle } from "@/lib/types";
import { driveTypeLabel } from "@/lib/drive-type";

/** Short brand for SEO titles (per marketing preference). */
export const SEO_TITLE_BRAND = "FC Auto";

const SITE_NAME = "FC Auto Export";

export type VehicleSeoInput = Pick<
  Vehicle,
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

/** SEO title — unique per vehicle, e.g. 2016 Toyota RAV4 Used Car for Export from China | FC Auto */
export function buildVehicleSeoTitle(vehicle: VehicleSeoInput, locale: Locale): string {
  const ybm = yearBrandModel(vehicle);
  if (locale === "zh") {
    return `${ybm} 中国出口二手车｜${SEO_TITLE_BRAND}`;
  }
  if (locale === "fr") {
    return `${ybm} voiture d'occasion à l'export depuis la Chine | ${SEO_TITLE_BRAND}`;
  }
  return `${ybm} Used Car for Export from China | ${SEO_TITLE_BRAND}`;
}

function joinMetaParts(parts: string[]): string {
  const text = parts.filter(Boolean).join(". ").replace(/\.\s*\./g, ".");
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

/** Meta description from real vehicle fields only. */
export function buildVehicleMetaDescription(vehicle: VehicleSeoInput, locale: Locale): string {
  const ybm = yearBrandModel(vehicle);
  const mileage = formatVehicleMileage(locale, vehicle.mileage);
  const drive = vehicle.driveType?.trim()
    ? driveTypeLabel(vehicle.driveType, locale)
    : "";
  const engine = vehicle.displacement?.trim() || "";

  if (locale === "zh") {
    const specs: string[] = [];
    if (vehicle.mileage != null) specs.push(`里程约 ${mileage} 公里`);
    if (engine) specs.push(engine);
    if (vehicle.fuel) specs.push(vehicle.fuel);
    if (vehicle.transmission) specs.push(vehicle.transmission);
    if (drive) specs.push(drive);
    if (vehicle.steering) specs.push(vehicle.steering);
    return joinMetaParts([
      `${ybm}。${specs.join("，")}`,
      "中国离岸价（FOB）",
      `由中国出口的二手车，${SITE_NAME} 提供出口服务`,
    ]);
  }

  if (locale === "fr") {
    const specs: string[] = [];
    if (vehicle.mileage != null) specs.push(`${mileage} km`);
    if (engine) specs.push(engine);
    if (vehicle.fuel) specs.push(vehicle.fuel);
    if (vehicle.transmission) specs.push(vehicle.transmission);
    if (drive) specs.push(drive);
    if (vehicle.steering) specs.push(vehicle.steering);
    return joinMetaParts([
      `${ybm}. ${specs.join(", ")}`,
      "Prix FOB Chine",
      `Véhicule d'occasion à l'export depuis la Chine par ${SITE_NAME}`,
    ]);
  }

  const specs: string[] = [];
  if (vehicle.mileage != null) specs.push(`${mileage} km`);
  if (engine) specs.push(engine);
  if (vehicle.fuel) specs.push(vehicle.fuel);
  if (vehicle.transmission) specs.push(vehicle.transmission);
  if (drive) specs.push(drive);
  if (vehicle.steering) specs.push(vehicle.steering);

  return joinMetaParts([
    `${ybm}. ${specs.join(", ")}`,
    "FOB China",
    `Used car for export from China by ${SITE_NAME}`,
  ]);
}

/** On-page SEO paragraph — natural prose from real fields. */
export function buildVehicleSeoParagraph(vehicle: VehicleSeoInput, locale: Locale): string {
  const ybm = yearBrandModel(vehicle);
  const mileage = formatVehicleMileage(locale, vehicle.mileage);
  const drive = vehicle.driveType?.trim()
    ? driveTypeLabel(vehicle.driveType, locale)
    : "";
  const engine = vehicle.displacement?.trim() || "";

  if (locale === "zh") {
    const traits: string[] = [];
    if (vehicle.steering) traits.push(vehicle.steering);
    if (vehicle.transmission) traits.push(`${vehicle.transmission}变速箱`);
    if (engine) traits.push(`${engine}发动机`);
    if (drive) traits.push(drive);
    if (vehicle.fuel) traits.push(vehicle.fuel);
    const traitText =
      traits.length > 0 ? `该车为${traits.join("、")}。` : "";
    return `探索这辆由 ${SITE_NAME} 提供的 ${ybm} 中国出口二手车。${traitText}里程约 ${mileage} 公里，面向国际买家、经销商与进口商开放出口。`;
  }

  if (locale === "fr") {
    const traits: string[] = [];
    if (vehicle.steering) traits.push(vehicle.steering);
    if (vehicle.transmission) traits.push(`boîte ${vehicle.transmission}`);
    if (engine) traits.push(`moteur ${engine}`);
    if (drive) traits.push(drive);
    if (vehicle.fuel) traits.push(vehicle.fuel);
    const traitText =
      traits.length > 0
        ? `Ce véhicule propose ${traits.join(", ")}. `
        : "";
    return `Découvrez ce ${ybm} disponible à l'export depuis la Chine avec ${SITE_NAME}. ${traitText}Environ ${mileage} km au compteur, pour les acheteurs internationaux, concessionnaires et importateurs.`;
  }

  const steering = vehicle.steering?.trim();
  const transmission = vehicle.transmission?.trim();
  const featureParts: string[] = [];
  if (engine) featureParts.push(`a ${engine} engine`);
  if (drive) featureParts.push(drive.toLowerCase());
  if (vehicle.fuel?.trim()) featureParts.push(vehicle.fuel.trim().toLowerCase());

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

type ViewLabel = { en: string; fr: string; zh: string };

function viewLabelForIndex(index: number, total: number): ViewLabel {
  if (index === 0) {
    return { en: "front view", fr: "vue avant", zh: "正面" };
  }
  if (total > 1 && index === total - 1) {
    return { en: "rear view", fr: "vue arrière", zh: "尾部" };
  }
  if (total > 2 && index === 1) {
    return { en: "interior", fr: "intérieur", zh: "内饰" };
  }
  return { en: "exterior view", fr: "vue extérieure", zh: "外观" };
}

/** Detail gallery alt — unique per image with view hint. */
export function vehicleDetailImageAlt(
  vehicle: Pick<Vehicle, "year" | "brand" | "model">,
  locale: Locale,
  photoIndex: number,
  totalPhotos: number
): string {
  const base = `${vehicle.year} ${vehicle.brand} ${vehicle.model}`;
  const view = viewLabelForIndex(photoIndex, totalPhotos);

  if (locale === "zh") {
    return `${base} ${view.zh} 中国出口二手车`;
  }
  if (locale === "fr") {
    return `${base} ${view.fr} voiture d'occasion de Chine`;
  }
  return `${base} ${view.en} used car from China`;
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
