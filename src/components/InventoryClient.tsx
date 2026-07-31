"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Vehicle, Locale } from "@/lib/types";
import { Translations } from "@/lib/translations";
import { getLocalizedPath } from "@/lib/i18n";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import AddToCartButton from "@/components/AddToCartButton";
import VehicleCardGallery, {
  collectVehicleCardImages,
} from "@/components/VehicleCardGallery";

const PAGE_SIZE = 9;

interface InventoryClientProps {
  vehicles: Vehicle[];
  locale: Locale;
  t: Translations;
  error?: string | null;
}

function inferBodyType(vehicle: Vehicle): string {
  if (vehicle.bodyType?.trim()) return vehicle.bodyType.trim();
  const name = `${vehicle.brand} ${vehicle.model}`.toLowerCase();
  if (name.includes("hilux") || name.includes("pickup")) return "Pickup";
  if (name.includes("corolla") || name.includes("sedan")) return "Sedan";
  if (
    name.includes("rav4") ||
    name.includes("prado") ||
    name.includes("cr-v") ||
    name.includes("x-trail") ||
    name.includes("glc") ||
    name.includes("x7") ||
    name.includes("land cruiser")
  ) {
    return "SUV";
  }
  return "Other";
}

const emptyFilters = {
  keyword: "",
  brand: "all",
  model: "all",
  year: "all",
  fuel: "all",
  transmission: "all",
  bodyType: "all",
  priceMin: "",
  priceMax: "",
};

export default function InventoryClient({
  vehicles,
  locale,
  t,
  error = null,
}: InventoryClientProps) {
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const options = useMemo(() => {
    const brands = [...new Set(vehicles.map((v) => v.brand))].sort();
    const models = [...new Set(vehicles.map((v) => v.model))].sort();
    const years = [...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a);
    const fuels = [...new Set(vehicles.map((v) => v.fuel))].sort();
    const transmissions = [...new Set(vehicles.map((v) => v.transmission))].sort();
    const bodyTypes = [...new Set(vehicles.map(inferBodyType))].sort();
    return { brands, models, years, fuels, transmissions, bodyTypes };
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const keyword = filters.keyword.trim().toLowerCase();
      if (keyword) {
        const haystack = `${v.brand} ${v.model} ${v.year} ${v.fuel} ${v.transmission}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (filters.brand !== "all" && v.brand !== filters.brand) return false;
      if (filters.model !== "all" && v.model !== filters.model) return false;
      if (filters.year !== "all" && String(v.year) !== filters.year) return false;
      if (filters.fuel !== "all" && v.fuel !== filters.fuel) return false;
      if (filters.transmission !== "all" && v.transmission !== filters.transmission) {
        return false;
      }
      if (filters.bodyType !== "all" && inferBodyType(v) !== filters.bodyType) return false;

      const min = filters.priceMin ? Number(filters.priceMin) : null;
      const max = filters.priceMax ? Number(filters.priceMax) : null;
      if (min !== null && !Number.isNaN(min) && v.fobPrice < min) return false;
      if (max !== null && !Number.isNaN(max) && v.fobPrice > max) return false;

      return true;
    });
  }, [vehicles, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFiltersOpen]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function updateFilter(key: keyof typeof emptyFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  const selectClass =
    "w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-brand-slate focus:outline-none focus:ring-2 focus:ring-accent-yellow/40 focus:border-accent-yellow";
  const inputClass =
    "w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-brand-slate placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-yellow/40 focus:border-accent-yellow";
  const labelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

  const filterPanel = (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-soft p-5">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-sm font-bold text-brand-slate tracking-wide">
          {t.inventory.filters}
        </h2>
        <button
          type="button"
          onClick={clearFilters}
          className="min-h-9 px-2.5 rounded-lg text-xs font-semibold text-brand-slate bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          {t.inventory.clearFilters}
        </button>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className={labelClass} htmlFor="filter-keyword">
            {t.inventory.keyword}
          </label>
          <input
            id="filter-keyword"
            type="text"
            value={filters.keyword}
            onChange={(e) => updateFilter("keyword", e.target.value)}
            placeholder={t.inventory.keywordPlaceholder}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-brand">
            {t.inventory.brand}
          </label>
          <select
            id="filter-brand"
            value={filters.brand}
            onChange={(e) => updateFilter("brand", e.target.value)}
            className={selectClass}
          >
            <option value="all">{t.inventory.allBrands}</option>
            {options.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-model">
            {t.inventory.model}
          </label>
          <select
            id="filter-model"
            value={filters.model}
            onChange={(e) => updateFilter("model", e.target.value)}
            className={selectClass}
          >
            <option value="all">{t.inventory.allModels}</option>
            {options.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-year">
            {t.inventory.year}
          </label>
          <select
            id="filter-year"
            value={filters.year}
            onChange={(e) => updateFilter("year", e.target.value)}
            className={selectClass}
          >
            <option value="all">{t.inventory.allYears}</option>
            {options.years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-fuel">
            {t.inventory.fuel}
          </label>
          <select
            id="filter-fuel"
            value={filters.fuel}
            onChange={(e) => updateFilter("fuel", e.target.value)}
            className={selectClass}
          >
            <option value="all">{t.inventory.allFuels}</option>
            {options.fuels.map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-transmission">
            {t.inventory.transmission}
          </label>
          <select
            id="filter-transmission"
            value={filters.transmission}
            onChange={(e) => updateFilter("transmission", e.target.value)}
            className={selectClass}
          >
            <option value="all">{t.inventory.allTransmissions}</option>
            {options.transmissions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-body">
            {t.inventory.bodyType}
          </label>
          <select
            id="filter-body"
            value={filters.bodyType}
            onChange={(e) => updateFilter("bodyType", e.target.value)}
            className={selectClass}
          >
            <option value="all">{t.inventory.allBodyTypes}</option>
            {options.bodyTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>{t.inventory.price}</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={filters.priceMin}
              onChange={(e) => updateFilter("priceMin", e.target.value)}
              placeholder={t.inventory.priceMin}
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              value={filters.priceMax}
              onChange={(e) => updateFilter("priceMax", e.target.value)}
              placeholder={t.inventory.priceMax}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="w-full min-h-11 mt-1 px-3 py-2.5 text-sm font-semibold text-brand-slate bg-accent-yellow hover:bg-accent-yellow-hover rounded-lg transition-colors"
        >
          {t.inventory.clearFilters}
        </button>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7 xl:gap-8">
      {/* Desktop fixed-width sticky sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
          {filterPanel}
        </div>
      </aside>

      <div className="min-w-0">
        {error ? (
          <p className="text-center text-red-600 py-16 bg-red-50 rounded-xl border border-red-100 text-sm">
            {t.inventory.loadError}. {error}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-brand-slate">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1
                  ? t.inventory.vehicle
                  : t.inventory.vehicles}
              </p>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden min-h-11 px-4 py-2.5 text-sm font-semibold text-brand-slate bg-white border border-slate-200 rounded-lg shadow-soft"
              >
                {t.inventory.showFilters}
              </button>
            </div>

            {/* Mobile filter slide-over drawer */}
            <div
              className={`lg:hidden fixed inset-0 z-[180] ${
                mobileFiltersOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
              aria-hidden={!mobileFiltersOpen}
            >
              <button
                type="button"
                className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${
                  mobileFiltersOpen ? "opacity-100" : "opacity-0"
                }`}
                aria-label={t.common.close}
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div
                className={`absolute inset-y-0 left-0 w-[min(100vw,20rem)] max-w-full bg-[#F7F8FA] shadow-elevated overflow-y-auto overflow-x-hidden transition-transform duration-300 ease-out ${
                  mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                role="dialog"
                aria-modal="true"
                aria-label={t.inventory.filters}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 bg-brand-slate text-white">
                  <h2 className="font-semibold text-sm">{t.inventory.filters}</h2>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-white/10"
                    aria-label={t.common.close}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 pb-8">{filterPanel}</div>
              </div>
            </div>

            {vehicles.length === 0 ? (
              <p className="text-center text-slate-500 py-20 bg-slate-50 rounded-xl border border-slate-100">
                {t.inventory.emptyInventory}
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-slate-500 py-20 bg-slate-50 rounded-xl border border-slate-100">
                {t.inventory.noResults}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                  {paged.map((vehicle, i) => (
                    <InventoryVehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      locale={locale}
                      t={t}
                      priority={i < 3}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="min-h-11 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-brand-slate disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      {t.inventory.prev}
                    </button>
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={`min-h-11 min-w-11 text-sm font-semibold rounded-lg transition-colors ${
                            page === pageNumber
                              ? "bg-accent-yellow text-brand-slate"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="min-h-11 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-brand-slate disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      {t.inventory.next}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InventoryVehicleCard({
  vehicle,
  locale,
  t,
  priority = false,
}: {
  vehicle: Vehicle;
  locale: Locale;
  t: Translations;
  priority?: boolean;
}) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: vehicle.currency || "USD",
      maximumFractionDigits: 0,
    }).format(price);

  const formatMileage = (km: number) => new Intl.NumberFormat("en-US").format(km);

  const galleryImages = collectVehicleCardImages(vehicle);

  return (
    <article className="bg-white rounded-xl border border-slate-100 shadow-soft overflow-hidden hover:shadow-soft-lg transition-shadow flex flex-col min-w-0">
      <VehicleCardGallery
        key={vehicle.id}
        images={galleryImages}
        alt={`${vehicle.brand} ${vehicle.model}`}
        priority={priority}
        labels={{
          previousImage: t.inventory.galleryPrevious,
          nextImage: t.inventory.galleryNext,
          imagePosition: t.inventory.galleryPosition,
        }}
      />

      <div className="p-3.5 flex flex-col flex-1 min-w-0">
        <h3 className="text-base font-bold text-brand-slate mb-2 leading-snug break-words">
          {vehicle.brand} {vehicle.model}
        </h3>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm mb-3">
          <div>
            <dt className="text-slate-400 text-[11px] leading-tight">{t.inventory.year}</dt>
            <dd className="text-brand-slate font-medium text-sm leading-tight">{vehicle.year}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[11px] leading-tight">{t.inventory.mileage}</dt>
            <dd className="text-brand-slate font-medium text-sm leading-tight">
              {formatMileage(vehicle.mileage)} {t.inventory.km}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[11px] leading-tight">{t.inventory.fuel}</dt>
            <dd className="text-brand-slate font-medium text-sm leading-tight">{vehicle.fuel}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[11px] leading-tight">{t.inventory.transmission}</dt>
            <dd className="text-brand-slate font-medium text-sm leading-tight">{vehicle.transmission}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-[11px] leading-tight">{t.inventory.steering}</dt>
            <dd className="text-brand-slate font-medium text-sm leading-tight">{vehicle.steering}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">
            {t.inventory.fobChina}
          </p>
          <p className="text-xl font-bold text-brand-slate mb-3">
            {formatPrice(vehicle.fobPrice)}
          </p>

          <div className="grid grid-cols-1 gap-2">
            <AddToCartButton
              vehicle={vehicle}
              addLabel={t.cart.addToCart}
              removeLabel={t.cart.removeFromCart}
              addToast={t.cart.addedToast}
              removeToast={t.cart.removedToast}
              className="w-full text-xs sm:text-sm"
            />
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
              <Link
                href={getLocalizedPath(`/inventory/${vehicle.id}`, locale)}
                className="min-h-11 inline-flex items-center justify-center px-2 bg-accent-yellow text-brand-slate text-xs sm:text-sm font-semibold rounded-lg hover:bg-accent-yellow-hover transition-colors"
              >
                {t.inventory.viewDetails}
              </Link>
              <WhatsAppAssignLink
                sourcePage="inventory-card"
                vehicleTitle={`${vehicle.brand} ${vehicle.model}`}
                vehicleYear={String(vehicle.year)}
                stockNumber={vehicle.id}
                vehicleId={vehicle.id}
                className="min-h-11 inline-flex items-center justify-center gap-1.5 px-2 bg-[#25D366] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#20BD5A] transition-colors"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t.nav.whatsapp}
              </WhatsAppAssignLink>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
