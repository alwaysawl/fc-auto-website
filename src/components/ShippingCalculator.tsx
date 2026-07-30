"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Locale } from "@/lib/types";
import { Translations } from "@/lib/translations";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import {
  SHIPPING_CURRENCY,
  SHIPPING_DESTINATIONS,
  SHIPPING_METHODS,
  VEHICLE_TYPES,
  findDestination,
  findPort,
  getLocalizedName,
  getSampleFreightUsd,
  type ShippingMethodId,
  type VehicleTypeId,
} from "@/data/shippingRates";

interface ShippingCalculatorProps {
  locale: Locale;
  t: Translations;
  /** Optional vehicle reference from inventory deep-link (?vehicle=) */
  vehicleReference?: string;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: SHIPPING_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ShippingCalculator({
  locale,
  t,
  vehicleReference,
}: ShippingCalculatorProps) {
  const s = t.shipping;
  const nameLocale = locale === "fr" ? "fr" : "en";

  const [countryId, setCountryId] = useState("");
  const [portId, setPortId] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleTypeId | "">("");
  const [method, setMethod] = useState<ShippingMethodId | "">("");
  const [fobInput, setFobInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const destination = useMemo(
    () => (countryId ? findDestination(countryId) : undefined),
    [countryId]
  );

  const ports = destination?.ports ?? [];

  const fobPrice = useMemo(() => {
    const raw = fobInput.replace(/,/g, "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [fobInput]);

  const freight =
    countryId && portId && vehicleType && method
      ? getSampleFreightUsd(countryId, portId, vehicleType, method)
      : null;

  const canCalculate = Boolean(
    countryId && portId && vehicleType && method && freight != null
  );

  const port = destination && portId ? findPort(destination, portId) : undefined;

  const countryLabel = destination
    ? getLocalizedName(destination.countryName, nameLocale)
    : "";
  const portLabel = port ? getLocalizedName(port.portName, nameLocale) : "";
  const vehicleLabel =
    vehicleType && s.vehicleTypes
      ? s.vehicleTypes[vehicleType]
      : vehicleType;
  const methodLabel =
    method && s.methods ? s.methods[method] : method;

  const fobPlusFreight =
    freight != null && fobPrice != null ? freight + fobPrice : null;

  function handleCountryChange(next: string) {
    setCountryId(next);
    setPortId("");
    setSubmitted(false);
  }

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    if (!canCalculate) return;
    setSubmitted(true);
  }

  const inquiryNote = useMemo(() => {
    if (!submitted || freight == null) return undefined;
    const lines = [
      "Shipping estimate request (SAMPLE):",
      `Country: ${countryLabel}`,
      `Port: ${portLabel}`,
      `Vehicle type: ${vehicleLabel}`,
      `Shipping method: ${methodLabel}`,
      `Estimated ocean freight: ${formatUsd(freight)} ${SHIPPING_CURRENCY}`,
    ];
    if (fobPrice != null) {
      lines.push(`Optional FOB price: ${formatUsd(fobPrice)} ${SHIPPING_CURRENCY}`);
      if (fobPlusFreight != null) {
        lines.push(
          `Estimated FOB + freight: ${formatUsd(fobPlusFreight)} ${SHIPPING_CURRENCY}`
        );
      }
    }
    if (vehicleReference) {
      lines.push(`Vehicle reference: ${vehicleReference}`);
    }
    return lines.join("\n");
  }, [
    submitted,
    freight,
    countryLabel,
    portLabel,
    vehicleLabel,
    methodLabel,
    fobPrice,
    fobPlusFreight,
    vehicleReference,
  ]);

  const fieldClass =
    "w-full min-h-11 px-3 py-2.5 rounded-md border border-slate-200 bg-white text-brand-slate text-base outline-none focus:ring-2 focus:ring-accent-yellow/60 focus:border-accent-yellow";

  const labelClass = "block text-sm font-semibold text-brand-slate mb-1.5";

  return (
    <div className="mx-auto w-full max-w-xl">
      <form onSubmit={handleCalculate} className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="ship-country" className={labelClass}>
            {s.destinationCountry}
          </label>
          <select
            id="ship-country"
            value={countryId}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={fieldClass}
            required
          >
            <option value="">{s.selectCountry}</option>
            {SHIPPING_DESTINATIONS.map((d) => (
              <option key={d.countryId} value={d.countryId}>
                {getLocalizedName(d.countryName, nameLocale)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ship-port" className={labelClass}>
            {s.destinationPort}
          </label>
          <select
            id="ship-port"
            value={portId}
            onChange={(e) => {
              setPortId(e.target.value);
              setSubmitted(false);
            }}
            className={fieldClass}
            required
            disabled={!countryId}
          >
            <option value="">{s.selectPort}</option>
            {ports.map((p) => (
              <option key={p.portId} value={p.portId}>
                {getLocalizedName(p.portName, nameLocale)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ship-vehicle-type" className={labelClass}>
            {s.vehicleType}
          </label>
          <select
            id="ship-vehicle-type"
            value={vehicleType}
            onChange={(e) => {
              setVehicleType(e.target.value as VehicleTypeId | "");
              setSubmitted(false);
            }}
            className={fieldClass}
            required
          >
            <option value="">—</option>
            {VEHICLE_TYPES.map((id) => (
              <option key={id} value={id}>
                {s.vehicleTypes?.[id] ?? id}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={labelClass}>{s.shippingMethod}</legend>
          <div className="grid grid-cols-2 gap-2">
            {SHIPPING_METHODS.map((id) => {
              const selected = method === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMethod(id);
                    setSubmitted(false);
                  }}
                  className={`min-h-11 px-3 rounded-md border text-sm font-semibold transition-colors ${
                    selected
                      ? "bg-brand-slate text-white border-brand-slate"
                      : "bg-white text-brand-slate border-slate-200 hover:border-brand-slate/40"
                  }`}
                  aria-pressed={selected}
                >
                  {s.methods?.[id] ?? id}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="ship-fob" className={labelClass}>
            {s.optionalFob}
          </label>
          <input
            id="ship-fob"
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            placeholder="0"
            value={fobInput}
            onChange={(e) => {
              setFobInput(e.target.value);
              setSubmitted(false);
            }}
            className={fieldClass}
          />
          <p className="mt-1.5 text-xs text-slate-500 leading-snug">
            {s.optionalFobHint}
          </p>
        </div>

        {vehicleReference && (
          <p className="text-sm text-slate-600 break-words">
            <span className="font-semibold text-brand-slate">
              {s.vehicleReference}:
            </span>{" "}
            {vehicleReference}
          </p>
        )}

        <button
          type="submit"
          disabled={!canCalculate}
          className="w-full min-h-11 inline-flex items-center justify-center rounded-md bg-accent-yellow text-brand-slate font-bold text-base px-4 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 transition"
        >
          {s.calculate}
        </button>
      </form>

      {submitted && freight != null && destination && port && (
        <div className="mt-6 sm:mt-8 rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-brand-slate flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-white font-semibold text-base sm:text-lg break-words">
              {s.resultTitle}
            </h2>
            <span className="inline-flex items-center rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide bg-accent-yellow text-brand-slate">
              {s.sampleBadge}
            </span>
          </div>

          <dl className="px-4 py-4 space-y-3 text-sm sm:text-base">
            <ResultRow label={s.destinationCountry} value={countryLabel} />
            <ResultRow label={s.destinationPort} value={portLabel} />
            <ResultRow label={s.vehicleType} value={String(vehicleLabel)} />
            <ResultRow label={s.shippingMethod} value={String(methodLabel)} />
            <ResultRow
              label={s.estimatedFreight}
              value={formatUsd(freight)}
              emphasize
            />
            {fobPrice != null && (
              <ResultRow label={s.fobPrice} value={formatUsd(fobPrice)} />
            )}
            {fobPlusFreight != null && (
              <ResultRow
                label={s.fobPlusFreight}
                value={formatUsd(fobPlusFreight)}
                emphasize
              />
            )}
            <ResultRow label={s.currency} value={SHIPPING_CURRENCY} />
          </dl>

          <p className="mx-4 mb-4 text-xs sm:text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
            {s.disclaimer}
          </p>

          {/* Extra bottom padding so floating WhatsApp FAB does not cover CTAs */}
          <div className="px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-3">
            <WhatsAppAssignLink
              sourcePage="shipping-calculator"
              vehicleTitle={vehicleReference}
              stockNumber={vehicleReference}
              inquiryNote={inquiryNote}
              className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-md bg-brand-slate text-white font-semibold text-sm sm:text-base px-4 hover:bg-brand-slate/90 transition text-center break-words"
            >
              {s.requestQuote}
            </WhatsAppAssignLink>
            <WhatsAppAssignLink
              sourcePage="shipping-calculator"
              vehicleTitle={vehicleReference}
              stockNumber={vehicleReference}
              inquiryNote={inquiryNote}
              className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] text-white font-semibold text-sm sm:text-base px-4 hover:bg-[#20BD5A] transition"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {s.whatsappCta}
            </WhatsAppAssignLink>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4 min-w-0">
      <dt className="text-slate-500 flex-shrink-0">{label}</dt>
      <dd
        className={`font-semibold text-brand-slate break-words text-left sm:text-right ${
          emphasize ? "text-base sm:text-lg" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
