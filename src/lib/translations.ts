import { Locale } from "@/lib/types";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import zh from "@/messages/zh.json";

export type Translations = typeof en;

const messages: Record<Locale, Translations> = {
  en,
  fr: fr as Translations,
  zh: zh as Translations,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deep-merge locale messages onto English so missing keys never surface as blank/raw paths. */
function mergeWithFallback<T>(fallback: T, override: unknown): T {
  if (!isPlainObject(fallback) || !isPlainObject(override)) {
    return (override ?? fallback) as T;
  }

  const result: Record<string, unknown> = { ...fallback };
  for (const key of Object.keys(fallback)) {
    const baseVal = (fallback as Record<string, unknown>)[key];
    const overVal = override[key];
    if (overVal === undefined || overVal === null || overVal === "") {
      result[key] = baseVal;
    } else if (isPlainObject(baseVal)) {
      result[key] = mergeWithFallback(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result as T;
}

export function getTranslations(locale: Locale): Translations {
  if (locale === "en") return messages.en;
  return mergeWithFallback(messages.en, messages[locale] ?? {});
}

export function getReviewText(
  text: { en: string; fr: string; zh?: string },
  locale: Locale
): string {
  if (locale === "zh") return text.zh?.trim() || text.en;
  if (locale === "fr") return text.fr?.trim() || text.en;
  return text.en;
}
