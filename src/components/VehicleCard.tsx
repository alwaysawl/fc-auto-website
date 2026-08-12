import Image from "next/image";
import Link from "next/link";
import { Vehicle, Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { Translations } from "@/lib/translations";
import VehicleCardFobPrice from "@/components/VehicleCardFobPrice";
import { vehicleImageAlt } from "@/lib/seo";

interface VehicleCardProps {
  vehicle: Vehicle;
  locale: Locale;
  t: Translations;
  variant?: "light" | "dark";
}

export default function VehicleCard({
  vehicle,
  locale,
  t,
  variant = "dark",
}: VehicleCardProps) {
  const isLight = variant === "light";

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: vehicle.currency || "USD",
      maximumFractionDigits: 0,
    }).format(price);

  const formatMileage = (km: number) =>
    new Intl.NumberFormat("en-US").format(km);

  const coverSrc =
    vehicle.mainImageUrl?.trim() ||
    vehicle.photos?.[0] ||
    "/images/rav4.jpg";

  return (
    <div
      className={`group overflow-hidden transition-all duration-300 ${
        isLight
          ? "bg-white rounded-2xl shadow-soft border border-slate-100 hover:shadow-soft-lg"
          : "card-premium"
      }`}
    >
      <div
        className={`relative aspect-[4/3] overflow-hidden ${
          isLight ? "bg-slate-100" : "bg-surface-elevated"
        }`}
      >
        <Image
          src={coverSrc}
          alt={vehicleImageAlt(vehicle, locale)}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {!isLight && (
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deeper/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        <div
          className={`absolute top-3 left-3 text-xs px-3 py-1 font-semibold ${
            isLight
              ? "bg-white/95 text-brand-slate rounded-lg shadow-soft"
              : "bg-charcoal-deeper/90 backdrop-blur-sm border border-white/10 text-gold rounded-sm"
          }`}
        >
          {vehicle.year}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <h3
          className={`text-lg sm:text-xl font-bold mb-2 transition-colors duration-300 break-words ${
            isLight
              ? "text-brand-slate group-hover:text-slate-600"
              : "font-display text-white group-hover:text-gold"
          }`}
        >
          {vehicle.brand} {vehicle.model}
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mb-5">
          <span>
            {formatMileage(vehicle.mileage)} {t.inventory.km}
          </span>
          <span>{vehicle.fuel}</span>
          <span>{vehicle.transmission}</span>
        </div>

        <div
          className={`pb-5 border-b ${
            isLight ? "border-slate-100" : "border-white/5"
          }`}
        >
          <VehicleCardFobPrice
            label={t.inventory.fobChina}
            price={formatPrice(vehicle.fobPrice)}
            variant={isLight ? "light" : "dark"}
            priceSize="2xl"
          />
        </div>

        <div className="mt-5">
          <Link
            href={getLocalizedPath(`/inventory/${vehicle.id}`, locale)}
            className={`block w-full text-sm py-2.5 text-center font-semibold rounded-xl transition-all duration-200 ${
              isLight
                ? "bg-accent-yellow text-brand-slate hover:bg-accent-yellow-hover"
                : "btn-primary"
            }`}
          >
            {t.inventory.viewDetails}
          </Link>
        </div>
      </div>
    </div>
  );
}
