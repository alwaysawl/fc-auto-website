"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Vehicle, Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";
import { Translations } from "@/lib/translations";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import AddToCartButton from "@/components/AddToCartButton";
import DownloadVehicleQuoteButton from "@/components/DownloadVehicleQuoteButton";

interface VehicleDetailClientProps {
  vehicle: Vehicle;
  similarVehicles: Vehicle[];
  locale: Locale;
  t: Translations;
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

function coverSrc(vehicle: Vehicle): string {
  return (
    vehicle.mainImageUrl?.trim() ||
    vehicle.photos?.[0] ||
    "/images/rav4.jpg"
  );
}

function statusLabel(
  status: string | undefined,
  t: Translations
): string {
  if (status === "在售") return t.vehicleDetail.inStock;
  if (status === "已售") return t.vehicleDetail.sold;
  if (status === "已下架") return t.vehicleDetail.unavailable;
  if (status === "草稿") return t.vehicleDetail.draft;
  return status?.trim() || t.vehicleDetail.available;
}

function nonemptyRows(
  rows: Array<{ label: string; value?: string | null }>
): Array<{ label: string; value: string }> {
  return rows
    .map((row) => ({
      label: row.label,
      value: (row.value ?? "").trim(),
    }))
    .filter((row) => row.value.length > 0 && row.value !== "—");
}

export default function VehicleDetailClient({
  vehicle,
  similarVehicles,
  locale,
  t,
}: VehicleDetailClientProps) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    country: "",
    whatsapp: "",
    email: "",
    message: t.vehicleDetail.defaultMessage,
  });

  // Public stock id only — never expose VIN
  const stockNumber = vehicle.id;
  const bodyType = inferBodyType(vehicle);
  const vehicleName =
    vehicle.titleEn?.trim() || `${vehicle.brand} ${vehicle.model}`;
  const currency = vehicle.currency || "USD";

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);

  const formatMileage = (km: number) => new Intl.NumberFormat("en-US").format(km);

  const photos = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (url?: string | null) => {
      const u = url?.trim();
      if (!u || u.startsWith("blob:") || seen.has(u)) return;
      seen.add(u);
      out.push(u);
    };
    push(vehicle.mainImageUrl);
    for (const u of vehicle.galleryImageUrls ?? []) push(u);
    for (const u of vehicle.photos ?? []) push(u);
    return out.length > 0 ? out : ["/images/rav4.jpg"];
  }, [vehicle]);

  const overview = useMemo(() => {
    if (vehicle.descriptionEn?.trim()) return vehicle.descriptionEn.trim();
    return `${vehicle.brand} ${vehicle.model} (${vehicle.year}) with ${formatMileage(vehicle.mileage)} ${t.inventory.km}, ${vehicle.fuel}, ${vehicle.transmission}, ${vehicle.steering}. FOB ${formatPrice(vehicle.fobPrice)}.`;
  }, [vehicle, t.inventory.km, currency]);

  function prevPhoto() {
    setActivePhoto((i) => (i === 0 ? photos.length - 1 : i - 1));
  }

  function nextPhoto() {
    setActivePhoto((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitted(true);
  }

  const summaryRows = nonemptyRows([
    { label: t.inventory.year, value: String(vehicle.year) },
    {
      label: t.inventory.mileage,
      value: `${formatMileage(vehicle.mileage)} ${t.inventory.km}`,
    },
    { label: t.inventory.fuel, value: vehicle.fuel },
    { label: t.inventory.transmission, value: vehicle.transmission },
    { label: t.vehicleDetail.engine, value: vehicle.displacement },
    { label: t.vehicleDetail.bodyType, value: bodyType },
    { label: t.inventory.steering, value: vehicle.steering },
    { label: t.vehicleDetail.color, value: vehicle.color },
    {
      label: t.vehicleDetail.seats,
      value: vehicle.seats != null ? String(vehicle.seats) : "",
    },
    { label: t.vehicleDetail.stockId, value: stockNumber },
    { label: t.vehicleDetail.exportPort, value: vehicle.exportPort },
    { label: t.vehicleDetail.status, value: statusLabel(vehicle.status, t) },
  ]);

  const basicInfo = nonemptyRows([
    { label: t.inventory.brand, value: vehicle.brand },
    { label: t.inventory.model, value: vehicle.model },
    { label: t.inventory.year, value: String(vehicle.year) },
    {
      label: t.inventory.mileage,
      value: `${formatMileage(vehicle.mileage)} ${t.inventory.km}`,
    },
    { label: t.vehicleDetail.bodyType, value: bodyType },
    { label: t.inventory.steering, value: vehicle.steering },
    { label: t.vehicleDetail.color, value: vehicle.color },
    {
      label: t.vehicleDetail.seats,
      value: vehicle.seats != null ? String(vehicle.seats) : "",
    },
  ]);

  const engineInfo = nonemptyRows([
    { label: t.inventory.fuel, value: vehicle.fuel },
    { label: t.inventory.transmission, value: vehicle.transmission },
    { label: t.vehicleDetail.engine, value: vehicle.displacement },
  ]);

  const exportInfo = nonemptyRows([
    { label: t.inventory.fobPrice, value: formatPrice(vehicle.fobPrice) },
    { label: t.vehicleDetail.stockId, value: stockNumber },
    { label: t.vehicleDetail.exportPort, value: vehicle.exportPort },
    { label: t.vehicleDetail.status, value: statusLabel(vehicle.status, t) },
    {
      label: t.vehicleDetail.availability,
      value:
        vehicle.status === "在售"
          ? t.vehicleDetail.inStock
          : statusLabel(vehicle.status, t),
    },
  ]);

  const featureLines = (vehicle.features ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

  const trustItems = [
    t.vehicleDetail.trustDocuments,
    t.vehicleDetail.trustShipping,
    t.vehicleDetail.trustSupport,
  ];

  const inputClass =
    "w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-brand-slate placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-yellow/40 focus:border-accent-yellow";

  const statusAvailable = vehicle.status === "在售" || !vehicle.status;

  return (
    <div className="bg-white min-h-screen pb-24 lg:pb-0">
      <div className="container-max px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <Link
          href={getLocalizedPath("/inventory", locale)}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-slate mb-6 transition-colors"
        >
          ← {t.common.backToInventory}
        </Link>

        {/* Top: gallery + summary */}
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8 lg:gap-10">
          {/* LEFT — gallery */}
          <div>
            <div className="relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
              <Image
                src={photos[activePhoto] ?? coverSrc(vehicle)}
                alt={vehicleName}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 65vw"
                priority
              />

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevPhoto}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-brand-slate shadow-soft flex items-center justify-center hover:bg-white transition-colors"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-brand-slate shadow-soft flex items-center justify-center hover:bg-white transition-colors"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {photos.map((photo, index) => (
                  <button
                    key={photo + index}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={`relative w-16 h-12 sm:w-20 sm:h-[60px] flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      activePhoto === index
                        ? "border-accent-yellow"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Image
                      src={photo}
                      alt={`${vehicleName} photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — summary */}
          <div>
            <h1 className="text-xl min-[375px]:text-2xl md:text-3xl font-bold text-brand-slate tracking-tight mb-2 break-words">
              {vehicleName}
            </h1>
            <p
              className={`inline-flex items-center gap-2 text-sm font-semibold mb-4 ${
                statusAvailable ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  statusAvailable ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {statusLabel(vehicle.status, t)}
            </p>

            <div className="mb-5 pb-5 border-b border-slate-100">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                {t.inventory.fobPrice}
              </p>
              <p className="text-3xl font-bold text-brand-slate">
                {formatPrice(vehicle.fobPrice)}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-6">
              {summaryRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                    {row.label}
                  </dt>
                  <dd className="font-medium text-brand-slate mt-0.5 break-all">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="hidden lg:grid grid-cols-1 gap-2.5 mb-6">
              <AddToCartButton
                vehicle={vehicle}
                addLabel={t.cart.addToCart}
                removeLabel={t.cart.removeFromCart}
                addToast={t.cart.addedToast}
                removeToast={t.cart.removedToast}
                className="h-11 w-full"
              />
              <DownloadVehicleQuoteButton
                vehicle={vehicle}
                locale={locale}
                t={t}
                className="h-11 w-full px-4 bg-accent-yellow text-brand-slate text-sm font-semibold rounded-lg hover:bg-accent-yellow-hover transition-colors"
              />
              <WhatsAppAssignLink
                sourcePage="vehicle-detail"
                vehicleTitle={`${vehicle.brand} ${vehicle.model}`}
                vehicleYear={String(vehicle.year)}
                stockNumber={stockNumber}
                className="h-11 inline-flex items-center justify-center gap-2 px-4 bg-[#25D366] text-white text-sm font-semibold rounded-lg hover:bg-[#20BD5A] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t.vehicleDetail.whatsappInquiry}
              </WhatsAppAssignLink>
            </div>

            <ul className="space-y-2.5">
              {trustItems.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-brand-slate">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Specifications */}
        <section className="mt-12 md:mt-16">
          <h2 className="text-xl md:text-2xl font-bold text-brand-slate mb-6">
            {t.vehicleDetail.specifications}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {basicInfo.length > 0 && (
              <SpecTable title={t.vehicleDetail.basicInfo} rows={basicInfo} />
            )}
            {engineInfo.length > 0 && (
              <SpecTable title={t.vehicleDetail.engine} rows={engineInfo} />
            )}
            {exportInfo.length > 0 && (
              <SpecTable title={t.vehicleDetail.exportInfo} rows={exportInfo} />
            )}
          </div>
        </section>

        {/* Overview */}
        <section className="mt-12 md:mt-16">
          <h2 className="text-xl md:text-2xl font-bold text-brand-slate mb-4">
            {t.vehicleDetail.overview}
          </h2>
          <p className="text-slate-600 leading-relaxed max-w-3xl whitespace-pre-line">
            {overview}
          </p>
        </section>

        {featureLines.length > 0 && (
          <section className="mt-12 md:mt-16">
            <h2 className="text-xl md:text-2xl font-bold text-brand-slate mb-4">
              {t.vehicleDetail.features}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-3xl">
              {featureLines.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Inquiry form */}
        <section className="mt-12 md:mt-16">
          <h2 className="text-xl md:text-2xl font-bold text-brand-slate mb-6">
            {t.vehicleDetail.inquiryForm}
          </h2>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 md:p-8 max-w-2xl">
            {formSubmitted ? (
              <p className="text-brand-slate font-medium">
                {t.contact.form.success}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    {t.contact.form.name}
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    {t.vehicleDetail.country}
                  </label>
                  <input
                    required
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    {t.nav.whatsapp}
                  </label>
                  <input
                    type="text"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    {t.contact.form.email}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    {t.contact.form.message}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-11 px-6 bg-accent-yellow text-brand-slate text-sm font-semibold rounded-lg hover:bg-accent-yellow-hover transition-colors"
                >
                  {t.contact.form.submit}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Similar vehicles */}
        {similarVehicles.length > 0 && (
          <section className="mt-12 md:mt-16">
            <h2 className="text-xl md:text-2xl font-bold text-brand-slate mb-6">
              {t.vehicleDetail.similarVehicles}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {similarVehicles.map((item) => (
                <Link
                  key={item.id}
                  href={getLocalizedPath(`/inventory/${item.id}`, locale)}
                  className="group bg-white border border-slate-100 rounded-xl shadow-soft overflow-hidden hover:shadow-soft-lg transition-shadow"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image
                      src={coverSrc(item)}
                      alt={`${item.brand} ${item.model}`}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-brand-slate text-sm mb-1">
                      {item.brand} {item.model}
                    </h3>
                    <p className="text-xs text-slate-500 mb-2">
                      {item.year} · {item.fuel}
                    </p>
                    <p className="text-base font-bold text-brand-slate">
                      {formatPrice(item.fobPrice)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky CTA bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 safe-area-pb">
        <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
          <AddToCartButton
            vehicle={vehicle}
            addLabel={t.cart.addToCart}
            removeLabel={t.cart.removeFromCart}
            addToast={t.cart.addedToast}
            removeToast={t.cart.removedToast}
            className="text-[11px] sm:text-sm px-1"
          />
          <DownloadVehicleQuoteButton
            vehicle={vehicle}
            locale={locale}
            t={t}
            className="min-h-11 bg-accent-yellow text-brand-slate text-[11px] sm:text-sm font-semibold rounded-lg px-1 text-center"
          />
          <WhatsAppAssignLink
            sourcePage="vehicle-detail-mobile"
            vehicleTitle={`${vehicle.brand} ${vehicle.model}`}
            vehicleYear={String(vehicle.year)}
            stockNumber={stockNumber}
            className="min-h-11 inline-flex items-center justify-center gap-1 bg-[#25D366] text-white text-[11px] sm:text-sm font-semibold rounded-lg px-1"
          >
            {t.nav.whatsapp}
          </WhatsAppAssignLink>
        </div>
      </div>
    </div>
  );
}

function SpecTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-soft">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-sm font-bold text-brand-slate">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.label}
              className={index < rows.length - 1 ? "border-b border-slate-100" : ""}
            >
              <td className="px-3 sm:px-4 py-2.5 text-slate-500 w-[40%] sm:w-[45%] align-top break-words">
                {row.label}
              </td>
              <td className="px-3 sm:px-4 py-2.5 font-medium text-brand-slate break-words">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
