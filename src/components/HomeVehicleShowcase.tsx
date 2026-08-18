import Image from "next/image";
import Link from "next/link";
import { Locale, Vehicle } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { Translations } from "@/lib/translations";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import VehicleCardFobPrice from "@/components/VehicleCardFobPrice";
import { vehicleImageAlt } from "@/lib/seo";
import { VEHICLE_CARD_IMAGE } from "@/lib/vehicle-image-cache";

interface HomeVehicleShowcaseProps {
  vehicles: Vehicle[];
  locale: Locale;
  t: Translations;
}

function displayModelName(vehicle: Vehicle): string {
  if (vehicle.model === "Land Cruiser Prado") return "Land Cruiser Prado";
  return vehicle.model;
}

function coverImageSrc(vehicle: Vehicle): string {
  if (vehicle.mainImageUrl?.trim()) return vehicle.mainImageUrl.trim();
  if (vehicle.photos?.[0]) return vehicle.photos[0];
  return "/images/rav4.jpg";
}

export default function HomeVehicleShowcase({
  vehicles,
  locale,
  t,
}: HomeVehicleShowcaseProps) {
  if (vehicles.length === 0) return null;

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-28 pb-10 md:pb-14">
      <div className="container-max">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-slate tracking-tight">
              {t.homeShowcase.title}
            </h2>
            <p className="text-slate-500 text-sm md:text-base mt-1">{t.homeShowcase.subtitle}</p>
          </div>
          <Link
            href={getLocalizedPath("/inventory", locale)}
            className="text-sm font-semibold text-brand-slate hover:text-slate-600 transition-colors whitespace-nowrap"
          >
            {t.latestVehicles.viewAll} →
          </Link>
        </div>

        {/* Desktop: 4 cards in one row */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-5">
          {vehicles.map((vehicle, index) => (
            <ShowcaseCard
              key={vehicle.id}
              vehicle={vehicle}
              locale={locale}
              t={t}
              badge={index === vehicles.length - 1 ? "sale" : "hot"}
            />
          ))}
        </div>

        {/* Mobile / tablet: horizontal scroll */}
        <div className="flex lg:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
          {vehicles.map((vehicle, index) => (
            <ShowcaseCard
              key={vehicle.id}
              vehicle={vehicle}
              locale={locale}
              t={t}
              badge={index === vehicles.length - 1 ? "sale" : "hot"}
              className="w-[240px] flex-shrink-0 snap-start"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseCard({
  vehicle,
  locale,
  t,
  badge,
  className = "",
}: {
  vehicle: Vehicle;
  locale: Locale;
  t: Translations;
  badge: "hot" | "sale";
  className?: string;
}) {
  const modelName = displayModelName(vehicle);
  const detailHref = getLocalizedPath(`/inventory/${vehicle.id}`, locale);
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: vehicle.currency || "USD",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <article
      className={`group bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden hover:shadow-soft-lg transition-shadow ${className}`}
    >
      <Link href={detailHref} className="block min-w-0">
        <div className="relative aspect-[4/3] bg-slate-50">
          <Image
            src={coverImageSrc(vehicle)}
            alt={vehicleImageAlt({ ...vehicle, model: modelName }, locale)}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 1023px) 240px, 400px"
            quality={VEHICLE_CARD_IMAGE.quality}
            loading="lazy"
          />
          <span
            className={`absolute bottom-3 right-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded text-white ${
              badge === "hot" ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            {badge === "hot" ? t.homeShowcase.hotBadge : t.homeShowcase.saleBadge}
          </span>
        </div>
        <div className="p-4 min-w-0">
          <h3 className="text-sm font-bold text-brand-slate break-words">
            {vehicle.brand} {modelName}
          </h3>
          <p className="text-xs text-slate-500 mt-1 break-words">
            {vehicle.year} | {vehicle.fuel}
          </p>
          <VehicleCardFobPrice
            label={t.inventory.fobChina}
            price={formatPrice(vehicle.fobPrice)}
            className="mt-2"
          />
        </div>
      </Link>

      <div className="px-4 pb-4 flex gap-2">
        <Link
          href={detailHref}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-accent-yellow text-brand-slate text-xs font-semibold rounded-md hover:bg-accent-yellow-hover transition-colors"
        >
          {t.inventory.viewDetails}
        </Link>
        <WhatsAppAssignLink
          sourcePage="home-showcase-card"
          vehicleTitle={`${vehicle.brand} ${modelName}`}
          vehicleYear={String(vehicle.year)}
          stockNumber={vehicle.id}
          vehicleId={vehicle.id}
          className="inline-flex items-center justify-center px-3 py-2 bg-[#25D366] text-white text-xs font-semibold rounded-md hover:bg-[#20BD5A] transition-colors"
          aria-label={`${t.homeShowcase.whatsapp} — ${vehicle.brand} ${modelName}`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </WhatsAppAssignLink>
      </div>
    </article>
  );
}
