"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Locale } from "@/lib/types";
import { localeNames, switchLocalePath } from "@/lib/i18n";
import { locales } from "@/lib/types";

interface LanguageSwitcherProps {
  locale: Locale;
  theme?: "light" | "dark" | "hero";
}

export default function LanguageSwitcher({ locale, theme = "dark" }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const isLight = theme === "light";
  const isHero = theme === "hero";

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((loc, index) => (
        <span key={loc} className="flex items-center">
          {index > 0 && (
            <span className={`mx-1 ${isHero ? "text-white/30" : isLight ? "text-slate-300" : "text-gray-400"}`}>|</span>
          )}
          <Link
            href={switchLocalePath(pathname, loc)}
            className={`px-2.5 py-1 rounded-lg transition-colors duration-200 text-xs font-semibold tracking-wide ${
              locale === loc
                ? isHero
                  ? "text-white bg-white/15 border border-white/20"
                  : isLight
                    ? "text-brand-slate bg-slate-100 border border-slate-200"
                    : "text-gold bg-gold/10 border border-gold/20 rounded-sm"
                : isHero
                  ? "text-white/60 hover:text-white hover:bg-white/10"
                  : isLight
                    ? "text-slate-400 hover:text-brand-slate hover:bg-slate-50"
                    : "text-gray-500 hover:text-white hover:bg-white/5 rounded-sm"
            }`}
          >
            {loc.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  );
}

export { localeNames };
