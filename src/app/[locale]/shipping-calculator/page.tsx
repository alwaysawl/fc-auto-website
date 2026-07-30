import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import { getVehicles } from "@/lib/data";
import ShippingCalculator from "@/components/ShippingCalculator";

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
  const vehicles = getVehicles();

  return (
    <section className="section-padding section-dark min-h-screen">
      <div className="container-max">
        <div className="text-center mb-16">
          <h1 className="heading-display mb-4">{t.shipping.title}</h1>
          <div className="gold-divider mb-6" />
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t.shipping.subtitle}</p>
        </div>
        <ShippingCalculator
          vehicles={vehicles}
          t={t}
          initialVehicleId={vehicleId}
        />
      </div>
    </section>
  );
}
