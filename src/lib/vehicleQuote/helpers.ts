import type { Locale, Vehicle } from "@/lib/types";
import { driveTypeLabel } from "@/lib/drive-type";
import { getVehicleQuoteCopy } from "@/lib/vehicleQuote/copy";

/** Sanitize for cross-OS filenames */
export function sanitizeFilenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\u4e00-\u9fff\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "vehicle";
}

export function buildQuoteFilename(vehicle: Vehicle): string {
  const name =
    vehicle.titleEn?.trim() || `${vehicle.brand} ${vehicle.model}`;
  const safeName = sanitizeFilenamePart(name);
  const safeId = sanitizeFilenamePart(vehicle.id);
  return `FC-Auto-Export-${safeName}-${safeId}-Quote.pdf`;
}

export function formatQuoteDate(locale: Locale, date = new Date()): string {
  const tag = locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(tag, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatQuotePrice(vehicle: Vehicle): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: vehicle.currency || "USD",
    maximumFractionDigits: 0,
  }).format(vehicle.fobPrice);
}

export function formatQuoteMileage(vehicle: Vehicle, locale: Locale): string {
  const n = new Intl.NumberFormat(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US"
  ).format(vehicle.mileage);
  return `${n} km`;
}

export function statusLabelForQuote(
  status: string | undefined,
  locale: Locale
): string {
  if (locale === "zh") {
    if (status === "在售") return "在售";
    if (status === "已售") return "已售";
    if (status === "已下架") return "已下架";
    if (status === "草稿") return "草稿";
    return status?.trim() || "可售";
  }
  if (locale === "fr") {
    if (status === "在售") return "En stock";
    if (status === "已售") return "Vendu";
    if (status === "已下架") return "Indisponible";
    if (status === "草稿") return "Brouillon";
    return status?.trim() || "Disponible";
  }
  if (status === "在售") return "In Stock";
  if (status === "已售") return "Sold";
  if (status === "已下架") return "Unavailable";
  if (status === "草稿") return "Draft";
  return status?.trim() || "Available";
}

function inferBodyType(vehicle: Vehicle): string {
  if (vehicle.bodyType?.trim()) return vehicle.bodyType.trim();
  const name = `${vehicle.brand} ${vehicle.model}`.toLowerCase();
  if (name.includes("hilux") || name.includes("pickup")) return "Pickup";
  if (name.includes("corolla") || name.includes("sedan")) return "Sedan";
  if (
    name.includes("rav4") ||
    name.includes("prado") ||
    name.includes("cr-v") ||
    name.includes("x-trail") ||
    name.includes("land cruiser")
  ) {
    return "SUV";
  }
  return "";
}

export type QuoteSpecRow = { label: string; value: string };

/** Build non-empty specification rows. VIN is intentionally omitted (not public). */
export function buildQuoteSpecRows(
  vehicle: Vehicle,
  locale: Locale
): QuoteSpecRow[] {
  const copy = getVehicleQuoteCopy(locale);
  const L = copy.fieldLabels;
  const body = inferBodyType(vehicle);
  const rows: Array<{ label: string; value?: string | null }> = [
    { label: L.brand, value: vehicle.brand },
    { label: L.model, value: vehicle.model },
    { label: L.year, value: String(vehicle.year) },
    { label: L.mileage, value: formatQuoteMileage(vehicle, locale) },
    { label: L.fuel, value: vehicle.fuel },
    { label: L.transmission, value: vehicle.transmission },
    { label: L.driveType, value: driveTypeLabel(vehicle.driveType, locale) },
    { label: L.bodyType, value: body },
    { label: L.steering, value: vehicle.steering },
    { label: L.engineCapacity, value: vehicle.displacement },
    { label: L.exteriorColor, value: vehicle.color },
    {
      label: L.seats,
      value: vehicle.seats != null ? String(vehicle.seats) : "",
    },
    { label: L.stockId, value: vehicle.id },
    { label: L.status, value: statusLabelForQuote(vehicle.status, locale) },
    { label: L.fobChina, value: formatQuotePrice(vehicle) },
    { label: L.exportPort, value: vehicle.exportPort },
  ];

  return rows
    .map((r) => ({ label: r.label, value: (r.value ?? "").trim() }))
    .filter((r) => r.value.length > 0 && r.value !== "—");
}

export function collectQuoteImageUrls(vehicle: Vehicle): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url?: string | null) => {
    const u = url?.trim();
    if (!u || u.startsWith("blob:") || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  push(vehicle.mainImageUrl);
  for (const u of vehicle.galleryImageUrls ?? []) push(u);
  for (const u of vehicle.photos ?? []) push(u);
  return out;
}

/**
 * Fields requested by the product brief that are not present on Vehicle:
 * - interior color
 * - separate "engine" string beyond displacement
 * VIN is available on the model but intentionally excluded from public quotes.
 */
export const QUOTE_OMITTED_FIELDS = [
  "interiorColor",
  "engine (separate from displacement)",
  "vin (not public)",
] as const;
