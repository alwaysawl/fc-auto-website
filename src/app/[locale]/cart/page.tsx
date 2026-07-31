import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import CartPageClient from "@/components/CartPageClient";
import type { Metadata } from "next";
import { CART_EXCLUDED_COUNTRY_IDS } from "@/lib/cart";
import {
  listShippingCountriesWithPorts,
  toCartShippingDestinations,
} from "@/lib/shippingDestinations/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const t = getTranslations(localeParam as Locale);
  return {
    title: t.cart.pageTitle,
    description: t.cart.pageDescription,
  };
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);

  const { countries } = await listShippingCountriesWithPorts({
    enabledOnly: true,
  });
  const destinations = toCartShippingDestinations(countries).filter(
    (d) => !CART_EXCLUDED_COUNTRY_IDS.has(d.countryId.trim().toLowerCase())
  );

  return (
    <div className="bg-[#F7F8FA] min-h-screen pb-[calc(9rem+env(safe-area-inset-bottom))] xl:pb-12">
      <section className="border-b border-slate-100 bg-white">
        <div className="container-max px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-slate tracking-tight">
            {t.cart.pageTitle}
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-2xl">
            {t.cart.pageSubtitle}
          </p>
        </div>
      </section>
      <div className="container-max px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <CartPageClient locale={locale} t={t} destinations={destinations} />
      </div>
    </div>
  );
}
