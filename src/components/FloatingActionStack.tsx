"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import { getLocalizedPath, isLocale } from "@/lib/i18n";
import { getTranslations } from "@/lib/translations";

/**
 * Shared lower-right floating actions:
 *   Cart (when cart has items)
 *   ↓
 *   WhatsApp
 *
 * Cart never covers WhatsApp. Empty cart hides only the cart button.
 * Header cart and WhatsApp assignment logic are unchanged.
 */
export default function FloatingActionStack() {
  const pathname = usePathname();
  const { count, ready } = useCart();

  const isCartPage = /\/cart\/?$/.test(pathname);
  const isVehicleDetail = /\/inventory\/[^/]+\/?$/.test(pathname);

  if (isCartPage) return null;

  const segment = pathname.split("/").filter(Boolean)[0] ?? "en";
  const locale = isLocale(segment) ? segment : "en";
  const t = getTranslations(locale);
  const cartLabel = t.nav.cart ?? "Cart";
  const showCart = ready && count > 0;
  const showWhatsApp = !isVehicleDetail;

  if (!showCart && !showWhatsApp) return null;

  // Sticky CTA is ~72px + padding; keep cart above it on vehicle detail.
  const bottomClass = isVehicleDetail
    ? "bottom-[calc(112px+env(safe-area-inset-bottom,0px))] right-3 sm:right-6 lg:bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] lg:right-4"
    : "bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-4 sm:right-6";

  return (
    <div
      className={`pointer-events-none fixed z-[90] flex flex-col items-end gap-3 ${bottomClass}`}
    >
      {showCart && (
        <Link
          href={getLocalizedPath("/cart", locale)}
          aria-label={`${cartLabel} (${count})`}
          className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-brand-slate pl-3.5 pr-4 text-white shadow-elevated hover:bg-[rgb(15,32,55)] transition-colors"
        >
          <span className="relative inline-flex items-center justify-center">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2.3 2.3c-.4.4-.1 1.1.4 1.1H19M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            <span className="absolute -top-2 -right-2 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-accent-yellow px-1 text-[10px] font-bold text-brand-slate">
              {count > 99 ? "99+" : count}
            </span>
          </span>
          <span className="hidden whitespace-nowrap text-sm font-semibold min-[360px]:inline">
            {cartLabel}
          </span>
        </Link>
      )}

      {showWhatsApp && (
        <WhatsAppAssignLink
          sourcePage="floating-button"
          className="pointer-events-auto group relative"
          aria-label={t.nav.whatsapp}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366] opacity-75 animate-pulse-gold" />
          <span className="relative flex items-center gap-3">
            <span className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-charcoal-deeper/95 px-4 py-2.5 text-sm font-medium text-white opacity-0 shadow-elevated backdrop-blur-sm transition-all duration-300 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 sm:flex">
              {t.nav.whatsapp}
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl sm:h-14 sm:w-14">
              <svg
                className="h-6 w-6 text-white sm:h-7 sm:w-7"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </span>
          </span>
        </WhatsAppAssignLink>
      )}
    </div>
  );
}
