"use client";

import { usePathname } from "next/navigation";
import { Locale } from "@/lib/types";

interface MainWrapperProps {
  locale: Locale;
  children: React.ReactNode;
}

function isHomePath(pathname: string, locale: Locale) {
  return pathname === `/${locale}` || pathname === `/${locale}/`;
}

function isInventoryListPath(pathname: string, locale: Locale) {
  return pathname === `/${locale}/inventory` || pathname === `/${locale}/inventory/`;
}

function isVehicleDetailPath(pathname: string, locale: Locale) {
  return pathname.startsWith(`/${locale}/inventory/`) && pathname !== `/${locale}/inventory/`;
}

export default function MainWrapper({ locale, children }: MainWrapperProps) {
  const pathname = usePathname();
  const isHome = isHomePath(pathname, locale);
  const isInventoryList = isInventoryListPath(pathname, locale);
  const isVehicleDetail = isVehicleDetailPath(pathname, locale);
  const isLightPage = isInventoryList || isVehicleDetail;

  return (
    <main
      className={`min-h-screen ${
        isHome
          ? "pt-0 bg-white"
          : isLightPage
            ? "pt-16 md:pt-[72px] bg-white"
            : "pt-16 md:pt-[72px] bg-charcoal-dark"
      }`}
    >
      {children}
    </main>
  );
}
