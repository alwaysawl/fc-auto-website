import type { Metadata } from "next";
import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import CarSourcingForm from "@/components/CarSourcingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const t = getTranslations(localeParam as Locale);
  return {
    title: t.seo.carSourcingTitle,
    description: t.seo.carSourcingDescription,
  };
}

export default async function CarSourcingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);
  const copy = t.carSourcing;

  return (
    <>
      <section className="bg-brand-slate text-white px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-b border-white/10">
        <div className="container-max max-w-3xl">
          <p className="text-accent-yellow text-xs font-semibold tracking-wide uppercase mb-3">
            FC Auto Export
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">
            {copy.title}
          </h1>
          <p className="mt-4 text-white/80 text-sm sm:text-base leading-relaxed whitespace-pre-line break-words">
            {copy.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="container-max max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-soft">
            <CarSourcingForm locale={locale} t={t} />
          </div>
        </div>
      </section>
    </>
  );
}
