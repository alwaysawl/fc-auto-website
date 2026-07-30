import { Locale } from "@/lib/types";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const messages: Record<Locale, typeof en> = { en, fr };

export function getTranslations(locale: Locale) {
  return messages[locale] ?? messages.en;
}

export type Translations = typeof en;
