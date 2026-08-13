import { Locale } from "@/lib/types";
import { getTranslations, getReviewText } from "@/lib/translations";
import { getReviews } from "@/lib/data";
import {
  dbGetHomepageShowcaseVehicles,
  dbGetLatestPublicVehicles,
} from "@/lib/supabase/vehicle-queries";
import { getLocalizedPath } from "@/lib/i18n";
import HeroBanner from "@/components/HeroBanner";
import HomeVehicleShowcase from "@/components/HomeVehicleShowcase";
import HomeWhyChooseTrust from "@/components/HomeWhyChooseTrust";
import VehicleCard from "@/components/VehicleCard";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { buildPageMetadata, homeGraphJsonLd } from "@/lib/seo";

/** Always fetch live featured vehicles — do not serve a build-time snapshot. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);
  return buildPageMetadata({
    locale,
    path: "/",
    title: t.seo.homeTitle,
    description: t.seo.homeDescription,
    image: "/images/hero-rav4.jpg",
    imageAlt: t.seo.homeTitle,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  noStore();
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);
  const reviews = getReviews();

  let latestVehicles: Awaited<ReturnType<typeof dbGetLatestPublicVehicles>> =
    [];
  let showcaseVehicles: Awaited<
    ReturnType<typeof dbGetHomepageShowcaseVehicles>
  > = [];
  try {
    // Latest Vehicles: status = 在售, ORDER BY created_at DESC, max 6
    latestVehicles = await dbGetLatestPublicVehicles();
    // Popular Models: featured = true ORDER BY homepage_rank ASC, max 4
    showcaseVehicles = await dbGetHomepageShowcaseVehicles();
  } catch (err) {
    console.error(
      "[HomePage] Supabase vehicles fetch failed:",
      err instanceof Error ? err.message : err
    );
  }

  return (
    <>
      <JsonLd data={homeGraphJsonLd()} />
      <HeroBanner locale={locale} t={t} />
      <HomeVehicleShowcase vehicles={showcaseVehicles} locale={locale} t={t} />

      {/* Company Introduction */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-28 bg-white">
        <div className="container-max text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-slate tracking-tight mb-4 sm:mb-6 break-words">
            {t.intro.title}
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed">{t.intro.description}</p>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-28 bg-slate-50">
        <div className="container-max">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-slate tracking-tight mb-4 break-words">
              {t.whyUs.title}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
              Professional export services built on trust and transparency.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.whyUs.items.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-soft border border-slate-100 hover:shadow-soft-lg transition-shadow duration-300 min-w-0"
              >
                <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center mb-5">
                  <span className="text-brand-slate font-bold text-lg">{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-brand-slate mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Vehicles */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-28 bg-white">
        <div className="container-max">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-16 gap-4 sm:gap-6">
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-slate tracking-tight mb-3 break-words">
                {t.latestVehicles.title}
              </h2>
              <p className="text-slate-500 text-sm sm:text-base">Quality inspected vehicles ready for export.</p>
            </div>
            <Link
              href={getLocalizedPath("/inventory", locale)}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-3 bg-accent-yellow text-brand-slate font-semibold rounded-xl hover:bg-accent-yellow-hover shadow-soft transition-all duration-200 text-sm w-full sm:w-auto"
            >
              {t.latestVehicles.viewAll}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                locale={locale}
                t={t}
                variant="light"
              />
            ))}
          </div>
        </div>
      </section>

      <HomeWhyChooseTrust t={t} />

      {/* Shipping Process */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-28 bg-slate-50">
        <div className="container-max">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-slate tracking-tight mb-4 break-words">
              {t.shippingProcess.title}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
              From selection to port delivery — a simple, transparent process.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
            {t.shippingProcess.steps.map((step, index) => (
              <div key={index} className="text-center min-w-0 px-1">
                <div className="w-14 h-14 bg-brand-slate text-white rounded-2xl flex items-center justify-center mx-auto mb-5 font-bold text-xl shadow-soft">
                  {index + 1}
                </div>
                <h3 className="font-semibold mb-3 text-sm text-brand-slate">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-28 bg-white">
        <div className="container-max">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-slate tracking-tight mb-4 break-words">
              {t.reviews.title}
            </h2>
            <p className="text-slate-500">{t.reviews.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-soft border border-slate-100 min-w-0"
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-accent-yellow"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  &ldquo;{getReviewText(review.text, locale)}&rdquo;
                </p>
                <div className="pt-4 border-t border-slate-100">
                  <p className="font-semibold text-brand-slate text-sm">{review.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{review.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conversion CTA */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-28 bg-slate-50">
        <div className="container-max">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-16 text-center max-w-3xl mx-auto shadow-soft border border-slate-100">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-slate tracking-tight mb-4 sm:mb-6 break-words">
              {t.cta.title}
            </h2>
            <p className="text-slate-500 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10">{t.cta.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <WhatsAppAssignLink
                sourcePage="home-cta"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-7 py-3.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20BD5A] shadow-soft transition-all duration-200 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t.cta.whatsapp}
              </WhatsAppAssignLink>
              <Link
                href={getLocalizedPath("/inventory", locale)}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-7 py-3.5 bg-accent-yellow text-brand-slate font-semibold rounded-xl hover:bg-accent-yellow-hover shadow-soft transition-all duration-200 w-full sm:w-auto"
              >
                {t.cta.browse}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
