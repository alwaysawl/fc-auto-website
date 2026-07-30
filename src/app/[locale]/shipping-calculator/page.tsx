import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import { getVehicles } from "@/lib/data";
import ShippingCalculator from "@/components/ShippingCalculator";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const t = getTranslations(localeParam as Locale);
  return {
    title: t.seo.shippingTitle,
    description: t.seo.shippingDescription,
  };
}

export default async function ShippingCalculatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { vehicle: vehicleId } = await searchParams;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);

  let vehicleReference: string | undefined;
  if (vehicleId) {
    const vehicles = getVehicles();
    const match = vehicles.find((v) => v.id === vehicleId);
    if (match) {
      vehicleReference = `${match.brand} ${match.model} (${match.year})`;
    } else {
      vehicleReference = vehicleId;
    }
  }

  return (
    <section className="section-padding min-h-screen bg-[#F7F8FA] text-brand-slate">
      <div className="container-max max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 px-1">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-brand-slate tracking-tight text-balance">
            {t.shipping.title}
          </h1>
          <div className="mx-auto mt-4 mb-4 h-0.5 w-14 bg-accent-yellow" />
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed text-pretty">
            {t.shipping.subtitle}
          </p>
        </div>
        <ShippingCalculator
          locale={locale}
          t={t}
          vehicleReference={vehicleReference}
        />
      </div>
    </section>
  );
}
