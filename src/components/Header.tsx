"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { Translations } from "@/lib/translations";
import LanguageSwitcher from "./LanguageSwitcher";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";

interface HeaderProps {
  locale: Locale;
  t: Translations;
  variant?: "light" | "dark" | "hero";
}

export default function Header({ locale, t, variant = "dark" }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHero = variant === "hero";
  const isLight = variant === "light";

  const navLinks = [
    { href: getLocalizedPath("/", locale), label: t.nav.home, key: "home" },
    { href: getLocalizedPath("/inventory", locale), label: t.nav.inventory, key: "inventory" },
    { href: getLocalizedPath("/shipping-calculator", locale), label: t.nav.shipping, key: "shipping" },
    { href: getLocalizedPath("/about", locale), label: t.nav.about, key: "about" },
    { href: getLocalizedPath("/contact", locale), label: t.nav.contact, key: "contact" },
  ];

  function isActive(href: string) {
    if (href === getLocalizedPath("/", locale)) {
      return pathname === href || pathname === `${href}/`;
    }
    return pathname.startsWith(href);
  }

  const langTheme = isHero ? "hero" : isLight ? "light" : "dark";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        isHero
          ? "bg-transparent border-b border-transparent"
          : isLight
            ? "bg-white/75 border-b border-slate-200/40 backdrop-blur-md"
            : "bg-charcoal-deeper/90 border-b border-white/5 backdrop-blur-md"
      }`}
    >
      <div className="container-max px-4 sm:px-6 lg:px-8">
        {/* Desktop hero layout — matches reference */}
        {isHero && (
          <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr] items-center h-[72px]">
            <Link href={getLocalizedPath("/", locale)} className="flex items-center gap-3 justify-self-start">
              <div className="w-10 h-10 bg-accent-yellow rounded-md flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-brand-slate text-sm">FC</span>
              </div>
              <div>
                <span className="block font-bold text-white text-base leading-tight">FC Auto Export</span>
                <span className="block text-[11px] text-white/60 mt-0.5">{t.nav.tagline}</span>
              </div>
            </Link>

            <nav className="flex items-center gap-2.5 justify-self-center">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className={`text-xs font-semibold uppercase tracking-[0.1em] px-3 py-2 transition-colors ${
                    isActive(link.href)
                      ? "text-accent-yellow"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3 justify-self-end">
              <LanguageSwitcher locale={locale} theme={langTheme} />
              <WhatsAppAssignLink
                sourcePage="header"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-sm font-semibold rounded-md hover:bg-[#20BD5A] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </WhatsAppAssignLink>
            </div>
          </div>
        )}

        {/* Desktop light / dark */}
        {!isHero && (
          <div
            className={`items-center h-16 md:h-[72px] ${
              isLight ? "hidden lg:grid lg:grid-cols-[1fr_auto_1fr]" : "flex justify-between"
            }`}
          >
            <Link href={getLocalizedPath("/", locale)} className="flex items-center gap-2.5 group justify-self-start">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isLight ? "bg-brand-slate text-white" : "bg-gold rounded-sm text-charcoal shadow-gold"
                }`}
              >
                <span className="font-bold text-sm">FC</span>
              </div>
              <span className={`font-semibold text-base tracking-tight ${isLight ? "text-brand-slate" : "text-white font-display text-lg"}`}>
                FC Auto Export
              </span>
            </Link>

            {isLight && (
              <nav className="flex items-center gap-0.5 justify-self-center">
                {navLinks.map((link) => (
                  <Link key={link.key} href={link.href} className="text-sm font-medium text-slate-600 hover:text-brand-slate px-4 py-2 rounded-lg hover:bg-white/60 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            <div className={`flex items-center gap-3 ${isLight ? "justify-self-end" : ""}`}>
              {!isLight && (
                <nav className="hidden lg:flex items-center gap-1">
                  {navLinks.map((link) => (
                  <Link key={link.key} href={link.href} className="text-gray-400 hover:text-gold transition-colors duration-200 text-xs font-medium uppercase tracking-[0.12em] px-4 py-2 rounded-sm hover:bg-white/5">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}
              <WhatsAppAssignLink
                sourcePage="header"
                className={`hidden md:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isLight ? "bg-[#25D366] text-white hover:bg-[#20BD5A]" : "bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs uppercase tracking-wide rounded-sm hover:bg-[#25D366]/20"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </WhatsAppAssignLink>
              <LanguageSwitcher locale={locale} theme={langTheme} />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`lg:hidden p-2 rounded-lg transition-colors ${isLight ? "text-brand-slate hover:bg-white/60" : "text-white hover:bg-white/5"}`}
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Mobile header — hero & light */}
        {(isHero || isLight) && (
          <div className={`flex lg:hidden items-center justify-between h-16 ${isHero ? "bg-black/30 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6" : ""}`}>
            <Link href={getLocalizedPath("/", locale)} className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${isHero ? "bg-accent-yellow" : "bg-brand-slate text-white"}`}>
                <span className={`font-bold text-sm ${isHero ? "text-brand-slate" : "text-white"}`}>FC</span>
              </div>
              <span className={`font-semibold text-sm tracking-tight ${isHero ? "text-white" : "text-brand-slate"}`}>FC Auto Export</span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher locale={locale} theme={langTheme} />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`p-2 rounded-lg ${isHero ? "text-white hover:bg-white/10" : "text-brand-slate hover:bg-white/60"}`}
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {mobileOpen && (
        <nav className={`lg:hidden backdrop-blur-md border-t px-4 py-4 ${isHero ? "bg-black/85 border-white/10" : isLight ? "bg-white/95 border-slate-200/40" : "bg-charcoal-deeper/98 border-white/5"}`}>
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-3.5 text-sm font-medium border-b last:border-0 transition-colors ${
                isHero
                  ? isActive(link.href)
                    ? "text-accent-yellow border-white/10"
                    : "text-white/80 hover:text-white border-white/10"
                  : isLight
                    ? "text-slate-600 hover:text-brand-slate border-slate-100"
                    : "text-gray-300 hover:text-gold uppercase tracking-wide border-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <WhatsAppAssignLink
            sourcePage="header-mobile"
            className="mt-4 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white text-sm font-semibold rounded-lg"
          >
            WhatsApp
          </WhatsAppAssignLink>
        </nav>
      )}
    </header>
  );
}
