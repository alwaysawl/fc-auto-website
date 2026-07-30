import { Locale } from "./types";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function getLocalizedPath(path: string, locale: Locale): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/") return `/${locale}`;
  return `/${locale}${cleanPath}`;
}

export function switchLocalePath(currentPath: string, newLocale: Locale): string {
  const segments = currentPath.split("/").filter(Boolean);
  if (segments.length > 0 && (segments[0] === "en" || segments[0] === "fr")) {
    segments[0] = newLocale;
  } else {
    segments.unshift(newLocale);
  }
  return `/${segments.join("/")}`;
}
