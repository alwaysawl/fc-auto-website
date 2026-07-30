"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Locale } from "@/lib/types";
import { localeNames, switchLocalePath } from "@/lib/i18n";
import { VISIBLE_LANGUAGE_OPTIONS, getLanguageOption, getComingSoonLabelForOption } from "@/lib/languages";

interface LanguageSwitcherProps {
  locale: Locale;
  theme?: "light" | "dark" | "hero";
  comingSoonLabel?: string;
  selectLanguageLabel?: string;
}

const MOBILE_MQ = "(max-width: 767px)";

export default function LanguageSwitcher({
  locale,
  theme = "dark",
  comingSoonLabel = "Coming soon",
  selectLanguageLabel = "Select Language",
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = getLanguageOption(locale);
  const isLight = theme === "light";
  const isHero = theme === "hero";

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(MOBILE_MQ);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Close sheet/dropdown when crossing mobile ↔ desktop breakpoint
  useEffect(() => {
    setOpen(false);
  }, [isMobile]);

  // Lock body scroll while the mobile bottom sheet is open
  useEffect(() => {
    if (!open || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile]);

  // Escape closes either surface
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Desktop: close when clicking outside the trigger + dropdown
  useEffect(() => {
    if (!open || isMobile) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, isMobile]);

  const triggerClass = isHero
    ? "text-white bg-white/10 border border-white/20 hover:bg-white/15"
    : isLight
      ? "text-brand-slate bg-slate-100 border border-slate-200 hover:bg-slate-50"
      : "text-white bg-white/5 border border-white/15 hover:bg-white/10";

  const desktopPanelClass = isHero
    ? "bg-[rgba(10,24,43,0.98)] border-white/15 text-white"
    : isLight
      ? "bg-white border-slate-200 text-brand-slate shadow-lg"
      : "bg-charcoal-deeper border-white/10 text-white";

  function renderLanguageItems(variant: "mobile" | "desktop") {
    const mobile = variant === "mobile";

    return VISIBLE_LANGUAGE_OPTIONS.map((option) => {
      const selected = Boolean(
        option.available && option.locale && option.locale === locale
      );
      const itemBase =
        "flex items-center justify-between gap-3 w-full min-h-11 px-4 py-3 text-left text-sm font-medium transition-colors";

      if (option.available && option.locale) {
        let itemClass: string;
        if (mobile) {
          itemClass = selected
            ? "bg-white/10 text-accent-yellow"
            : "text-white hover:bg-white/5 active:bg-white/10";
        } else if (selected) {
          itemClass = isLight
            ? "bg-slate-100 text-brand-slate"
            : "bg-white/10 text-accent-yellow";
        } else {
          itemClass = isLight ? "hover:bg-slate-50" : "hover:bg-white/5";
        }

        return (
          <li key={option.code} role="option" aria-selected={selected}>
            <Link
              href={switchLocalePath(pathname, option.locale)}
              onClick={() => setOpen(false)}
              className={`${itemBase} ${itemClass}`}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {selected && (
                <span className="text-sm flex-shrink-0" aria-hidden>
                  ✓
                </span>
              )}
            </Link>
          </li>
        );
      }

      const soonLabel = getComingSoonLabelForOption(option, comingSoonLabel);

      return (
        <li key={option.code} role="option" aria-selected={false} aria-disabled>
          <div
            className={`${itemBase} cursor-default select-none ${
              mobile
                ? "text-white/45"
                : isLight
                  ? "text-slate-400 opacity-70"
                  : "text-white/50 opacity-70"
            }`}
            // Coming-soon rows must not navigate or dismiss the sheet
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span className="min-w-0 break-words">{option.label}</span>
            <span className="text-[11px] font-normal whitespace-nowrap flex-shrink-0">
              {soonLabel}
            </span>
          </div>
        </li>
      );
    });
  }

  const mobileSheet =
    mounted &&
    open &&
    isMobile &&
    createPortal(
      <div className="md:hidden" role="presentation">
        <div
          className="fixed inset-0 z-[200] bg-black/55"
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          id={listId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${listId}-title`}
          className="fixed inset-x-0 bottom-0 z-[210] w-full max-w-[100vw] overflow-x-hidden rounded-t-2xl border-t border-white/10 bg-[rgb(10,24,43)] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-white/10">
            <h2
              id={`${listId}-title`}
              className="text-base font-semibold tracking-tight min-w-0 break-words pr-2"
            >
              {selectLanguageLabel}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center min-h-11 min-w-11 flex-shrink-0 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ul role="listbox" className="py-1.5 overflow-x-hidden">
            {renderLanguageItems("mobile")}
          </ul>
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 min-h-11 min-w-11 px-2.5 sm:px-3 rounded-lg text-xs font-semibold tracking-wide transition-colors ${triggerClass}`}
        aria-haspopup={isMobile ? "dialog" : "listbox"}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Language: ${current.label}`}
      >
        <svg
          className="w-4 h-4 flex-shrink-0 opacity-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
        </svg>
        <span>{current.short}</span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 opacity-80 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Desktop / tablet dropdown — unchanged absolute panel (not used below 768px) */}
      {open && !isMobile && (
        <div
          id={listId}
          role="listbox"
          aria-label={selectLanguageLabel}
          className={`absolute right-0 top-full mt-2 z-[120] w-56 rounded-lg border overflow-hidden ${desktopPanelClass}`}
        >
          <ul className="py-2">{renderLanguageItems("desktop")}</ul>
        </div>
      )}

      {mobileSheet}
    </div>
  );
}

export { localeNames };
