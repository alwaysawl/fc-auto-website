import { Locale } from "./types";
import { locales } from "./types";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  zh: "中文",
};

export function getLocalizedPath(path: string, locale: Locale): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/") return `/${locale}`;
  return `/${locale}${cleanPath}`;
}

export function switchLocalePath(currentPath: string, newLocale: Locale): string {
  const segments = currentPath.split("/").filter(Boolean);
  if (segments.length > 0 && (locales as string[]).includes(segments[0])) {
    segments[0] = newLocale;
  } else {
    segments.unshift(newLocale);
  }
  return `/${segments.join("/")}`;
}

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}
