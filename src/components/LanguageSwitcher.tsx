"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Locale } from "@/lib/types";
import { localeNames, switchLocalePath } from "@/lib/i18n";
import { LANGUAGE_OPTIONS, getLanguageOption } from "@/lib/languages";

interface LanguageSwitcherProps {
  locale: Locale;
  theme?: "light" | "dark" | "hero";
  comingSoonLabel?: string;
}

export default function LanguageSwitcher({
  locale,
  theme = "dark",
  comingSoonLabel = "Coming soon",
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = getLanguageOption(locale);
  const isLight = theme === "light";
  const isHero = theme === "hero";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerClass = isHero
    ? "text-white bg-white/10 border border-white/20 hover:bg-white/15"
    : isLight
      ? "text-brand-slate bg-slate-100 border border-slate-200 hover:bg-slate-50"
      : "text-white bg-white/5 border border-white/15 hover:bg-white/10";

  const panelClass = isHero
    ? "bg-[rgba(10,24,43,0.98)] border-white/15 text-white"
    : isLight
      ? "bg-white border-slate-200 text-brand-slate shadow-lg"
      : "bg-charcoal-deeper border-white/10 text-white";

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 min-h-11 min-w-11 px-2.5 sm:px-3 rounded-lg text-xs font-semibold tracking-wide transition-colors ${triggerClass}`}
        aria-haspopup="listbox"
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

      {open && (
        <>
          <div
            className="fixed inset-0 z-[110] bg-black/40 xl:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            id={listId}
            role="listbox"
            aria-label="Select language"
            className={`z-[120] border overflow-hidden ${panelClass}
              fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[70dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]
              xl:absolute xl:inset-auto xl:right-0 xl:top-full xl:mt-2 xl:bottom-auto xl:w-56 xl:rounded-lg xl:max-h-none xl:pb-0`}
          >
            <div className="xl:hidden flex justify-center pt-3 pb-1">
              <span className="block w-10 h-1 rounded-full bg-white/25" aria-hidden />
            </div>
            <ul className="py-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = option.locale === locale;
                const itemBase =
                  "flex items-center justify-between gap-3 w-full min-h-11 px-4 py-3 text-left text-sm font-medium transition-colors";

                if (option.available && option.locale) {
                  return (
                    <li key={option.code} role="option" aria-selected={selected}>
                      <Link
                        href={switchLocalePath(pathname, option.locale)}
                        onClick={() => setOpen(false)}
                        className={`${itemBase} ${
                          selected
                            ? isLight
                              ? "bg-slate-100 text-brand-slate"
                              : "bg-white/10 text-accent-yellow"
                            : isLight
                              ? "hover:bg-slate-50"
                              : "hover:bg-white/5"
                        }`}
                      >
                        <span>{option.label}</span>
                        {selected && (
                          <span className="text-xs opacity-70" aria-hidden>
                            ✓
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={option.code} role="option" aria-selected={false} aria-disabled>
                    <div
                      className={`${itemBase} cursor-not-allowed opacity-55 ${
                        isLight ? "text-slate-400" : "text-white/50"
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="text-[11px] font-normal whitespace-nowrap">
                        {comingSoonLabel}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export { localeNames };
