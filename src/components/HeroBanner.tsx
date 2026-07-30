import Link from "next/link";
import Image from "next/image";
import { Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { Translations } from "@/lib/translations";
import HomeTrustFeatures from "./HomeTrustFeatures";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";

const HERO_BG = "/images/hero-rav4.jpg";

interface HeroBannerProps {
  locale: Locale;
  t: Translations;
}

export default function HeroBanner({ locale, t }: HeroBannerProps) {
  return (
    <div className="relative">
      <section className="relative h-[560px] sm:h-[650px] md:h-[680px] overflow-hidden">
        {/* Full-width continuous hero background — vehicle integrated, not in a box */}
        <Image
          src={HERO_BG}
          alt=""
          fill
          priority
          className="object-cover object-[86%_center] md:object-[84%_center] scale-[0.96]"
          sizes="100vw"
          aria-hidden
        />

        {/* Left darker overlay for readable text; right stays brighter for vehicle */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10 md:from-black/75 md:via-black/40 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

        {/* Content — left aligned */}
        <div className="relative container-max h-full px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="max-w-[24rem] pt-16 md:pt-20 pb-28 md:pb-32">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-0.5 bg-accent-yellow" aria-hidden />
              <span className="text-white/90 text-xs font-semibold uppercase tracking-[0.15em]">
                {t.hero.badge}
              </span>
            </div>

            <h1 className="text-[1.9rem] sm:text-[2.3rem] md:text-[2.35rem] lg:text-[2.7rem] font-bold text-white leading-[1.12] tracking-tight mb-4">
              {t.hero.titleLine1}
              <br />
              {t.hero.titleLine2}{" "}
              <span className="text-accent-yellow">{t.hero.titleHighlight}</span>
            </h1>

            <p className="text-white/85 text-sm md:text-base font-medium mb-1">
              {t.hero.brands}
            </p>
            <p className="text-white/65 text-sm md:text-base leading-relaxed mb-8 max-w-md">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href={getLocalizedPath("/inventory", locale)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-yellow text-brand-slate text-sm font-semibold rounded-md hover:bg-accent-yellow-hover transition-colors"
              >
                {t.hero.cta}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <WhatsAppAssignLink
                sourcePage="hero"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/10 text-white text-sm font-semibold rounded-md border border-white/35 hover:bg-white/15 transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t.hero.whatsappCta}
              </WhatsAppAssignLink>
              <Link
                href={getLocalizedPath("/shipping-calculator", locale)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/10 text-white text-sm font-semibold rounded-md border border-white/35 hover:bg-white/15 transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {t.hero.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar overlapping hero bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 z-20 px-4 sm:px-6 lg:px-8">
        <HomeTrustFeatures t={t} variant="bar" />
      </div>
    </div>
  );
}
