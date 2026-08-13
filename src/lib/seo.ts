import type { Metadata } from "next";
import { Locale, locales, Vehicle } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import {
  buildVehicleMetaDescription,
  buildVehicleSeoTitle,
  seoTitleBrandName,
  steeringTitleToken,
  vehicleCardImageAlt,
  yearBrandModelForSeoTitle,
} from "@/lib/vehicle-detail-seo";

export const SITE_NAME = "FC Auto Export";
export const SITE_URL = "https://fcautoexport.com";
export const DEFAULT_LOCALE: Locale = "en";

/** Canonical production origin (no trailing slash). */
export function getSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (!fromEnv) return SITE_URL;

  try {
    const parsed = new URL(fromEnv);
    const host = parsed.hostname.toLowerCase();
    // Public canonical / OG / JSON-LD must never point at local or preview hosts.
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".vercel.app") ||
      host === "www.fcautoexport.com"
    ) {
      return SITE_URL;
    }
    return fromEnv;
  } catch {
    return SITE_URL;
  }
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
  /** Optional OG image alt; defaults to page title when omitted. */
  imageAlt?: string;
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
  imageAlt,
  noIndex = false,
  type = "website",
}: BuildPageMetadataInput): Metadata {
  const url = localeAbsoluteUrl(path, locale);
  const ogImage = absoluteImageUrl(image ?? undefined);
  const alternates = buildAlternates(path, locale);
  const ogImageAlt = imageAlt?.trim() || title;
  const alternateLocale = locales
    .filter((item) => item !== locale)
    .map((item) => ogLocale(item));

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
      alternateLocale,
      type,
      ...(ogImage
        ? { images: [{ url: ogImage, alt: ogImageAlt }] }
        : {}),
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
  >,
  locale: Locale,
  catalog: Array<
    Pick<
      Vehicle,
      | "id"
      | "year"
      | "brand"
      | "model"
      | "driveType"
      | "displacement"
      | "mileage"
      | "transmission"
    >
  > = []
): { title: string; description: string } {
  return {
    title: buildVehicleSeoTitle(vehicle, locale, catalog),
    description: buildVehicleMetaDescription(vehicle, locale),
  };
}

/** Accessible/SEO alt text for inventory cards and similar listings. */
export function vehicleImageAlt(
  vehicle: Pick<Vehicle, "year" | "brand" | "model">,
  locale: Locale = "en",
  photoIndex?: number
): string {
  return vehicleCardImageAlt(vehicle, locale, photoIndex);
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
        logo: absoluteUrl("/images/fc-logo.png"),
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

/** Car structured data — only fields that exist on the vehicle record. */
export function vehicleJsonLd(
  vehicle: Pick<
    Vehicle,
    | "id"
    | "year"
    | "brand"
    | "model"
    | "titleEn"
    | "mileage"
    | "fuel"
    | "transmission"
    | "steering"
    | "driveType"
    | "displacement"
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
  const description = buildVehicleMetaDescription(vehicle, locale);
  const url = localeAbsoluteUrl(`/inventory/${vehicle.id}`, locale);
  const image = absoluteImageUrl(vehicleCoverImage(vehicle));
  const brandName = seoTitleBrandName(vehicle.brand);
  const name = yearBrandModelForSeoTitle(vehicle);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Car",
  };

  if (url.startsWith("https://") || url.startsWith("http://")) data.url = url;
  if (description) data.description = description;
  if (name) data.name = name;

  if (brandName) {
    data.brand = {
      "@type": "Brand",
      name: brandName,
    };
  }

  if (vehicle.model?.trim()) data.model = vehicle.model.trim();

  if (vehicle.year != null && Number.isFinite(vehicle.year)) {
    data.vehicleModelDate = String(vehicle.year);
  }

  if (typeof vehicle.mileage === "number" && Number.isFinite(vehicle.mileage)) {
    data.mileageFromOdometer = {
      "@type": "QuantitativeValue",
      value: vehicle.mileage,
      unitCode: "KMT",
    };
  }

  if (vehicle.fuel?.trim()) data.fuelType = vehicle.fuel.trim();
  if (vehicle.transmission?.trim()) {
    data.vehicleTransmission = vehicle.transmission.trim();
  }

  const configuration = steeringTitleToken(vehicle.steering, "en");
  if (configuration) data.vehicleConfiguration = configuration;

  if (vehicle.color?.trim()) data.color = vehicle.color.trim();
  if (vehicle.bodyType?.trim()) data.bodyType = vehicle.bodyType.trim();
  if (vehicle.driveType?.trim()) {
    data.driveWheelConfiguration = vehicle.driveType.trim();
  }
  if (vehicle.displacement?.trim()) {
    data.vehicleEngine = {
      "@type": "EngineSpecification",
      name: vehicle.displacement.trim(),
    };
  }
  if (image && /^https?:\/\//i.test(image)) data.image = image;

  const hasPrice =
    typeof vehicle.fobPrice === "number" &&
    Number.isFinite(vehicle.fobPrice) &&
    vehicle.fobPrice > 0;
  const currency = vehicle.currency?.trim();

  if (hasPrice && currency) {
    const offer: Record<string, unknown> = {
      "@type": "Offer",
      url,
      price: vehicle.fobPrice,
      priceCurrency: currency.toUpperCase(),
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: getSiteUrl(),
      },
    };
    if (vehicle.status === "在售") {
      offer.availability = "https://schema.org/InStock";
    } else if (vehicle.status === "已售") {
      offer.availability = "https://schema.org/SoldOut";
    }
    data.offers = offer;
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
