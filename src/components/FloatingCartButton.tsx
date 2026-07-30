"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { getLocalizedPath, isLocale } from "@/lib/i18n";
import { getTranslations } from "@/lib/translations";

/**
 * Mobile/tablet floating cart — only rendered when cart has items.
 * Hidden on desktop (xl+) and on the cart page itself.
 * Header cart button remains unchanged.
 */
export default function FloatingCartButton() {
  const pathname = usePathname();
  const { count, ready } = useCart();

  if (!ready || count < 1) return null;

  const isCartPage = /\/cart\/?$/.test(pathname);
  if (isCartPage) return null;

  const segment = pathname.split("/").filter(Boolean)[0] ?? "en";
  const locale = isLocale(segment) ? segment : "en";
  const t = getTranslations(locale);
  const cartLabel = t.nav.cart ?? "Cart";
  const href = getLocalizedPath("/cart", locale);

  return (
    <Link
      href={href}
      aria-label={`${cartLabel} (${count})`}
      className="xl:hidden fixed z-[90] right-4 inline-flex items-center gap-2 min-h-12 pl-3.5 pr-4 rounded-full bg-brand-slate text-white shadow-elevated border border-white/10 hover:bg-[rgb(15,32,55)] transition-colors"
      style={{
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <span className="relative inline-flex items-center justify-center">
        <span className="text-base leading-none" aria-hidden>
          🛒
        </span>
        <span className="absolute -top-2 -right-2 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-accent-yellow text-brand-slate text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      </span>
      <span className="text-sm font-semibold whitespace-nowrap hidden min-[360px]:inline">
        {cartLabel}
      </span>
    </Link>
  );
}
