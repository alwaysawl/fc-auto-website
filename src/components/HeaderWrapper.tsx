"use client";

import { usePathname } from "next/navigation";
import { Locale } from "@/lib/types";
import { Translations } from "@/lib/translations";
import Header from "./Header";

interface HeaderWrapperProps {
  locale: Locale;
  t: Translations;
}

function isHomePath(pathname: string, locale: Locale) {
  return pathname === `/${locale}` || pathname === `/${locale}/`;
}

export default function HeaderWrapper({ locale, t }: HeaderWrapperProps) {
  const pathname = usePathname();
  const isHome = isHomePath(pathname, locale);

  return <Header locale={locale} t={t} variant={isHome ? "hero" : "dark"} />;
}
