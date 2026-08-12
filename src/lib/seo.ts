import type { Metadata } from "next";
import { Locale, locales, Vehicle } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";

export const SITE_NAME = "FC Auto Export";
export const SITE_URL = "https://fcautoexport.com";
export const DEFAULT_LOCALE: Locale = "en";

/** Canonical production origin (no trailing slash). */
export function getSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return SITE_URL;
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Absolute URL for a locale-prefixed public path (never apex-only for page content). */
export function localeAbsoluteUrl(pathWithoutLocale: string, locale: Locale): string {
  return absoluteUrl(getLocalizedPath(pathWithoutLocale, locale));
}

export function absoluteImageUrl(src: string | null | undefined): string | undefined {
  if (!src?.trim()) return undefined;
  const value = src.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return absoluteUrl(value.startsWith("/") ? value : `/${value}`);
}

export function ogLocale(locale: Locale): string {
  if (locale === "zh") return "zh_CN";
  if (locale === "fr") return "fr_FR";
  return "en_US";
}

export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : locale;
}

/**
 * Canonical + hreflang for a path without locale prefix.
 * Example path: "/" | "/inventory" | "/inventory/abc"
 */
export function buildAlternates(
  pathWithoutLocale: string,
  locale: Locale
): NonNullable<Metadata["alternates"]> {
  const canonical = localeAbsoluteUrl(pathWithoutLocale, locale);
  const languages: Record<string, string> = {
    en: localeAbsoluteUrl(pathWithoutLocale, "en"),
    fr: localeAbsoluteUrl(pathWithoutLocale, "fr"),
    "zh-CN": localeAbsoluteUrl(pathWithoutLocale, "zh"),
    "x-default": localeAbsoluteUrl(pathWithoutLocale, DEFAULT_LOCALE),
  };

  return {
    canonical,
    languages,
  };
}

type BuildPageMetadataInput = {
  locale: Locale;
  /** Path without locale prefix, e.g. "/" or "/inventory" */
  path: string;
  title: string;
  description: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article";
};

/** Shared public-page metadata: absolute title, canonical, hreflang, OG, Twitter. */
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  image,
  noIndex = false,
  type = "website",
}: BuildPageMetadataInput): Metadata {
  const url = localeAbsoluteUrl(path, locale);
  const ogImage = absoluteImageUrl(image ?? undefined);
  const alternates = buildAlternates(path, locale);

  return {
    metadataBase: new URL(getSiteUrl()),
    title: { absolute: title },
    description,
    alternates,
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      type,
      ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export function vehicleDisplayName(vehicle: Pick<Vehicle, "year" | "brand" | "model" | "titleEn">): string {
  const titled = vehicle.titleEn?.trim();
  if (titled) return titled;
  return `${vehicle.year} ${vehicle.brand} ${vehicle.model}`.trim();
}

export function vehicleCoverImage(vehicle: Pick<Vehicle, "mainImageUrl" | "photos">): string | undefined {
  return (
    vehicle.mainImageUrl?.trim() ||
    vehicle.photos?.find((p) => Boolean(p?.trim())) ||
    undefined
  );
}

/** Locale-aware vehicle detail title/description (no invented facts). */
export function buildVehicleSeoCopy(
  vehicle: Pick<
    Vehicle,
    | "year"
    | "brand"
    | "model"
    | "titleEn"
    | "descriptionEn"
    | "mileage"
    | "fuel"
    | "transmission"
    | "fobPrice"
    | "currency"
  >,
  locale: Locale
): { title: string; description: string } {
  const brandModel = `${vehicle.brand} ${vehicle.model}`.trim();
  const yearBrandModel = `${vehicle.year} ${brandModel}`.trim();

  let title: string;
  if (locale === "zh") {
    title = `${yearBrandModel} 中国出口二手车｜${SITE_NAME}`;
  } else if (locale === "fr") {
    title = `${yearBrandModel} voiture d'occasion à l'export depuis la Chine | ${SITE_NAME}`;
  } else {
    title = `${yearBrandModel} Used Car for Export from China | ${SITE_NAME}`;
  }

  const mileage = new Intl.NumberFormat(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US"
  ).format(vehicle.mileage);

  const custom = vehicle.descriptionEn?.trim();
  let description: string;
  if (custom) {
    description = custom.length > 160 ? `${custom.slice(0, 157)}…` : custom;
  } else if (locale === "zh") {
    description = `${yearBrandModel}，里程约 ${mileage} 公里，${vehicle.fuel}，${vehicle.transmission}。由 ${SITE_NAME} 从中国出口的在售二手车。`;
  } else if (locale === "fr") {
    description = `${yearBrandModel} — environ ${mileage} km, ${vehicle.fuel}, ${vehicle.transmission}. Véhicule d'occasion proposé à l'export depuis la Chine par ${SITE_NAME}.`;
  } else {
    description = `${yearBrandModel} with about ${mileage} km, ${vehicle.fuel}, ${vehicle.transmission}. Quality used car for export from China by ${SITE_NAME}.`;
  }

  return { title, description };
}

/** Accessible/SEO alt text unique per vehicle. */
export function vehicleImageAlt(
  vehicle: Pick<Vehicle, "year" | "brand" | "model">,
  locale: Locale = "en",
  photoIndex?: number
): string {
  const base =
    locale === "zh"
      ? `${vehicle.year} ${vehicle.brand} ${vehicle.model} 中国出口二手车`
      : locale === "fr"
        ? `${vehicle.year} ${vehicle.brand} ${vehicle.model} voiture d'occasion à l'export depuis la Chine`
        : `${vehicle.year} ${vehicle.brand} ${vehicle.model} used car for export from China`;

  if (photoIndex != null && photoIndex > 0) {
    return locale === "zh"
      ? `${base}（图 ${photoIndex}）`
      : locale === "fr"
        ? `${base} (photo ${photoIndex})`
        : `${base} (photo ${photoIndex})`;
  }
  return base;
}

export function homeGraphJsonLd() {
  const enHome = localeAbsoluteUrl("/", DEFAULT_LOCALE);
  const site = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: SITE_NAME,
        url: site,
      },
      {
        "@type": "WebSite",
        "@id": `${enHome}#website`,
        name: SITE_NAME,
        url: enHome,
        inLanguage: ["en", "fr", "zh-CN"],
        publisher: { "@id": `${site}/#organization` },
      },
    ],
  };
}

/** Car + Offer from real vehicle fields only (public in-stock listings). */
export function vehicleJsonLd(
  vehicle: Pick<
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
    | "color"
    | "bodyType"
    | "fobPrice"
    | "currency"
    | "mainImageUrl"
    | "photos"
    | "status"
  >,
  locale: Locale
) {
  const { description } = buildVehicleSeoCopy(vehicle, locale);
  const url = localeAbsoluteUrl(`/inventory/${vehicle.id}`, locale);
  const image = absoluteImageUrl(vehicleCoverImage(vehicle));
  const currency = (vehicle.currency || "USD").toUpperCase();

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: vehicleDisplayName(vehicle),
    brand: {
      "@type": "Brand",
      name: vehicle.brand,
    },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileage,
      unitCode: "KMT",
    },
    url,
    description,
  };

  if (vehicle.fuel) data.fuelType = vehicle.fuel;
  if (vehicle.transmission) data.vehicleTransmission = vehicle.transmission;
  if (vehicle.color) data.color = vehicle.color;
  if (vehicle.bodyType) data.bodyType = vehicle.bodyType;
  if (image) data.image = image;

  // Public pages only list 在售 vehicles — Offer uses real FOB price shown on site.
  if (typeof vehicle.fobPrice === "number" && Number.isFinite(vehicle.fobPrice)) {
    data.offers = {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price: vehicle.fobPrice,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: getSiteUrl(),
      },
    };
  }

  return data;
}

export const PUBLIC_INDEXABLE_PATHS = [
  "/",
  "/inventory",
  "/about",
  "/contact",
  "/car-sourcing",
] as const;
