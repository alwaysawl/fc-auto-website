import type { Locale } from "@/lib/types";

/** Display languages for the UI switcher. Only `available: true` map to live routes. */
export type LanguageOption = {
  code: string;
  label: string;
  /** Short code shown on the compact button (e.g. EN, FR) */
  short: string;
  /** Maps to a routable Locale when available */
  locale?: Locale;
  available: boolean;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", short: "EN", locale: "en", available: true },
  { code: "fr", label: "Français", short: "FR", locale: "fr", available: true },
  { code: "es", label: "Español", short: "ES", available: false },
  { code: "pt", label: "Português", short: "PT", available: false },
  { code: "ar", label: "العربية", short: "AR", available: false },
  { code: "zh", label: "中文", short: "中文", available: false },
];

/**
 * Languages shown in the UI switcher.
 * Temporarily limited to implemented locales; keep LANGUAGE_OPTIONS intact
 * so Español / Português / العربية / 中文 can be re-enabled without redesign.
 */
export const VISIBLE_LANGUAGE_OPTIONS: LanguageOption[] =
  LANGUAGE_OPTIONS.filter((option) => option.available && option.locale);

export function getLanguageOption(locale: Locale): LanguageOption {
  return (
    LANGUAGE_OPTIONS.find((l) => l.locale === locale) ?? LANGUAGE_OPTIONS[0]
  );
}
