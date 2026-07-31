"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { Translations } from "@/lib/translations";
import LanguageSwitcher from "./LanguageSwitcher";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import { useCart } from "@/components/CartProvider";

interface HeaderProps {
  locale: Locale;
  t: Translations;
  variant?: "light" | "dark" | "hero";
}

const SCROLL_THRESHOLD_PX = 50;
const DESKTOP_NAV_MQ = "(min-width: 1280px)";

export default function Header({ locale, t, variant = "dark" }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHero = variant === "hero";
  const isLight = variant === "light";
  const { count } = useCart();
  const cartHref = getLocalizedPath("/cart", locale);
  const cartLabel = t.nav.cart ?? "Cart";

  useEffect(() => {
    const updateScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_NAV_MQ);
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const navLinks = [
    { href: getLocalizedPath("/", locale), label: t.nav.home, key: "home" },
    { href: getLocalizedPath("/inventory", locale), label: t.nav.inventory, key: "inventory" },
    {
      href: getLocalizedPath("/shipping-calculator", locale),
      label: t.nav.shipping,
      key: "shipping",
    },
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
  const menuLabel = t.nav.menu ?? "Menu";
  const comingSoon = t.nav.comingSoon ?? "Coming soon";
  const selectLanguage = t.nav.selectLanguage ?? "Select Language";
  const closeLabel = t.nav.close ?? t.common.close ?? "Close";
  const whatsappLabel = t.nav.whatsapp ?? "WhatsApp";

  const heroNavLinkClass = (href: string) =>
    `text-[15px] font-semibold px-2 py-2 whitespace-nowrap flex-shrink-0 transition-colors ${
      locale === "zh" ? "tracking-normal" : "uppercase tracking-[0.06em]"
    } ${
      isActive(href) ? "text-accent-yellow" : "text-white hover:text-white/90"
    }`;

  const lightNavLinkClass =
    "text-[15px] font-semibold text-slate-600 hover:text-brand-slate px-2 py-2 rounded-lg hover:bg-white/60 transition-colors whitespace-nowrap flex-shrink-0";

  const darkNavLinkClass = (href: string) =>
    `text-[15px] font-semibold px-2 py-2 rounded-sm whitespace-nowrap flex-shrink-0 transition-colors duration-200 ${
      locale === "zh" ? "tracking-normal" : "uppercase tracking-[0.06em]"
    } ${
      isActive(href)
        ? "text-accent-yellow"
        : "text-gray-300 hover:text-gold hover:bg-white/5"
    }`;

  const headerSurfaceClass = isHero
    ? scrolled
      ? "bg-[rgba(10,24,43,0.96)] border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.28)] backdrop-blur-md"
      : "bg-transparent border-b border-transparent shadow-none"
    : isLight
      ? "bg-white/75 border-b border-slate-200/40 backdrop-blur-md"
      : "bg-[rgba(10,24,43,0.96)] border-b border-white/10 backdrop-blur-md";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out ${headerSurfaceClass}`}
    >
      <div className="container-max px-4 sm:px-6 xl:px-8">
        <div
          className={`flex flex-nowrap items-center gap-2 sm:gap-3 min-h-14 sm:min-h-16 md:min-h-[72px] py-1.5 ${
            isHero && !scrolled
              ? "max-xl:bg-black/30 max-xl:backdrop-blur-sm max-xl:-mx-4 max-xl:px-4 sm:max-xl:-mx-6 sm:max-xl:px-6"
              : isHero && scrolled
                ? "max-xl:-mx-4 max-xl:px-4 sm:max-xl:-mx-6 sm:max-xl:px-6"
                : ""
          }`}
        >
          <Link
            href={getLocalizedPath("/", locale)}
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0"
          >
            <div
              className={`flex items-center justify-center flex-shrink-0 ${
                isHero
                  ? "w-9 h-9 sm:w-10 sm:h-10 bg-accent-yellow rounded-md"
                  : isLight
                    ? "w-9 h-9 bg-brand-slate text-white rounded-lg"
                    : "w-9 h-9 bg-accent-yellow rounded-md text-brand-slate"
              }`}
            >
              <span
                className={`font-bold text-sm ${isHero || !isLight ? "text-brand-slate" : ""}`}
              >
                FC
              </span>
            </div>
            <div className="min-w-0 hidden min-[360px]:block">
              <span
                className={`block font-bold leading-tight whitespace-nowrap truncate max-w-[9.5rem] sm:max-w-none ${
                  isHero
                    ? "text-white text-sm sm:text-base"
                    : isLight
                      ? "text-brand-slate text-sm sm:text-base"
                      : "text-white text-sm sm:text-base"
                }`}
              >
                FC Auto Export
              </span>
              {isHero && (
                <span className="hidden md:block text-[11px] text-white/60 mt-0.5 leading-snug max-w-[12rem]">
                  {t.nav.tagline}
                </span>
              )}
            </div>
          </Link>

          <nav className="hidden xl:flex flex-1 min-w-0 flex-nowrap items-center justify-center gap-x-2 2xl:gap-x-3 overflow-visible">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={
                  isHero
                    ? heroNavLinkClass(link.href)
                    : isLight
                      ? lightNavLinkClass
                      : darkNavLinkClass(link.href)
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-nowrap items-center gap-1 md:gap-2.5 flex-shrink-0 ml-auto">
            <Link
              href={cartHref}
              className={`relative inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 md:min-w-0 px-1.5 md:px-2.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
                isHero
                  ? isActive(cartHref)
                    ? "text-accent-yellow bg-white/10"
                    : "text-white hover:bg-white/10"
                  : isLight
                    ? isActive(cartHref)
                      ? "text-brand-slate bg-slate-100"
                      : "text-brand-slate hover:bg-white/60"
                    : isActive(cartHref)
                      ? "text-accent-yellow bg-white/10"
                      : "text-white hover:bg-white/10"
              }`}
              aria-label={count > 0 ? `${cartLabel} (${count})` : cartLabel}
            >
              <span className="text-base leading-none" aria-hidden>
                🛒
              </span>
              <span className="hidden md:inline whitespace-nowrap">
                {cartLabel}
                {count > 0 ? ` (${count})` : ""}
              </span>
              {count > 0 && (
                <span className="md:hidden absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-accent-yellow text-brand-slate text-[10px] font-bold flex items-center justify-center">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>

            <LanguageSwitcher
              locale={locale}
              theme={langTheme}
              comingSoonLabel={comingSoon}
              selectLanguageLabel={selectLanguage}
              closeLabel={closeLabel}
            />

            <WhatsAppAssignLink
              sourcePage="header"
              className={`hidden xl:inline-flex items-center gap-2 px-3 py-2 min-h-11 text-sm font-semibold rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isHero || isLight
                  ? "bg-[#25D366] text-white hover:bg-[#20BD5A]"
                  : "bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs uppercase tracking-wide rounded-sm hover:bg-[#25D366]/20"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {whatsappLabel}
            </WhatsAppAssignLink>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`xl:hidden inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 md:min-w-0 px-1.5 md:px-3 rounded-lg transition-colors flex-shrink-0 text-sm font-semibold ${
                isHero
                  ? "text-white hover:bg-white/10"
                  : isLight
                    ? "text-brand-slate hover:bg-white/60"
                    : "text-white hover:bg-white/10"
              }`}
              aria-label={menuLabel}
              aria-expanded={mobileOpen}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
              <span className="hidden md:inline">{menuLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className={`xl:hidden max-h-[calc(100dvh-3.5rem)] overflow-y-auto overflow-x-hidden backdrop-blur-md border-t px-4 py-3 ${
            isHero
              ? scrolled
                ? "bg-[rgba(10,24,43,0.98)] border-white/10"
                : "bg-black/90 border-white/10"
              : isLight
                ? "bg-white/98 border-slate-200/40"
                : "bg-[rgba(10,24,43,0.98)] border-white/10"
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center min-h-11 py-3 text-base font-medium border-b transition-colors break-words ${
                isHero
                  ? isActive(link.href)
                    ? "text-accent-yellow border-white/10"
                    : "text-white/85 hover:text-white border-white/10"
                  : isLight
                    ? "text-slate-600 hover:text-brand-slate border-slate-100"
                    : isActive(link.href)
                      ? "text-accent-yellow border-white/10"
                      : "text-white/85 hover:text-white border-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={cartHref}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center justify-between min-h-11 py-3 text-base font-medium border-b transition-colors ${
              isHero || !isLight
                ? isActive(cartHref)
                  ? "text-accent-yellow border-white/10"
                  : "text-white/85 hover:text-white border-white/10"
                : "text-slate-600 hover:text-brand-slate border-slate-100"
            }`}
          >
            <span>
              🛒 {cartLabel}
              {count > 0 ? ` (${count})` : ""}
            </span>
          </Link>
          <WhatsAppAssignLink
            sourcePage="header-mobile"
            className="mt-3 mb-1 flex items-center justify-center gap-2 min-h-11 py-3 bg-[#25D366] text-white text-sm font-semibold rounded-lg w-full"
          >
            {whatsappLabel}
          </WhatsAppAssignLink>
        </nav>
      )}
    </header>
  );
}
