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
  /** Whether the option appears in the language selector UI */
  visible: boolean;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", short: "EN", locale: "en", available: true, visible: true },
  { code: "fr", label: "Français", short: "FR", locale: "fr", available: true, visible: true },
  { code: "es", label: "Español", short: "ES", available: false, visible: false },
  { code: "pt", label: "Português", short: "PT", available: false, visible: false },
  { code: "ar", label: "العربية", short: "AR", available: false, visible: false },
  // /zh is not a live Locale yet — visible but disabled until fully implemented
  { code: "zh", label: "中文", short: "中文", available: false, visible: true },
];

/**
 * Languages shown in the language selector.
 * Español / Português / العربية stay prepared in LANGUAGE_OPTIONS but hidden from UI.
 */
export const VISIBLE_LANGUAGE_OPTIONS: LanguageOption[] =
  LANGUAGE_OPTIONS.filter((option) => option.visible);

/** Language-switcher chrome copy (prepared for locales beyond live routing). */
export const LANGUAGE_SWITCHER_COPY: Record<
  string,
  { selectLanguage: string; comingSoon: string }
> = {
  en: {
    selectLanguage: "Select Language",
    comingSoon: "Coming soon",
  },
  fr: {
    selectLanguage: "Choisir la langue",
    comingSoon: "Bientôt disponible",
  },
  zh: {
    selectLanguage: "选择语言",
    comingSoon: "即将推出",
  },
};

export function getLanguageOption(locale: Locale): LanguageOption {
  return (
    LANGUAGE_OPTIONS.find((l) => l.locale === locale) ?? LANGUAGE_OPTIONS[0]
  );
}

export function getComingSoonLabelForOption(
  option: LanguageOption,
  fallback: string
): string {
  return LANGUAGE_SWITCHER_COPY[option.code]?.comingSoon ?? fallback;
}
