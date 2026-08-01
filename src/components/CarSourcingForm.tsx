"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import type { Translations } from "@/lib/translations";
import { DRIVE_TYPE_VALUES, driveTypeLabel } from "@/lib/drive-type";
import {
  buildCarSourcingInquiryNote,
  normalizeCarSourcingInput,
  validateCarSourcingValues,
  type CarSourcingFormValues,
} from "@/lib/car-sourcing";
import { openAssignedWhatsApp } from "@/lib/whatsapp-client";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

const FUEL_OPTIONS = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"] as const;
const TRANSMISSION_OPTIONS = [
  "Automatic",
  "Manual",
  "CVT",
  "Semi-Automatic",
] as const;

const EMPTY: CarSourcingFormValues = {
  customerName: "",
  whatsapp: "",
  country: "",
  brand: "",
  model: "",
  budget: "",
  quantity: "1",
  year: "",
  transmission: "",
  fuel: "",
  drive: "",
  color: "",
  destinationCountry: "",
  destinationPort: "",
  needShipping: "",
  otherRequirements: "",
};

type Props = {
  locale: Locale;
  t: Translations;
};

export default function CarSourcingForm({ locale, t }: Props) {
  const copy = t.carSourcing;
  const [values, setValues] = useState<CarSourcingFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const driveOptions = useMemo(
    () =>
      DRIVE_TYPE_VALUES.map((value) => ({
        value,
        label: driveTypeLabel(value, locale),
      })),
    [locale]
  );

  const setField =
    (key: keyof CarSourcingFormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setValues((prev) => ({ ...prev, [key]: e.target.value }));
      setError(null);
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const normalized = normalizeCarSourcingInput(values);
    const validated = validateCarSourcingValues(
      normalized,
      copy.validationRequired
    );
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      trackAnalyticsEvent("custom_sourcing_submit", {
        locale,
        pagePath:
          typeof window !== "undefined" ? window.location.pathname : null,
        metadata: { has_shipping_preference: Boolean(normalized.needShipping) },
        dedupeKey: `custom_sourcing_submit|${Date.now()}`,
      });

      // Best-effort CRM row — never blocks WhatsApp
      try {
        await fetch("/api/car-sourcing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...normalized, locale }),
        });
      } catch {
        /* ignore */
      }

      const inquiryNote = buildCarSourcingInquiryNote(normalized);
      await openAssignedWhatsApp({
        sourcePage: "car-sourcing",
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        vehicleTitle: `${normalized.brand} ${normalized.model}`.trim(),
        vehicleYear: normalized.year || undefined,
        inquiryNote,
      });

      setDone(true);
    } catch {
      setError(copy.submitError);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-emerald-900">{copy.success}</p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setValues(EMPTY);
          }}
          className="mt-4 text-sm font-medium text-brand-slate underline underline-offset-2"
        >
          {copy.submitAnother}
        </button>
      </div>
    );
  }

  const labelCls =
    "block text-sm font-medium text-brand-slate mb-1.5";
  const inputCls =
    "w-full min-h-11 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-brand-slate placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-yellow/60 focus:border-accent-yellow";
  const optionalMark = (
    <span className="text-slate-400 font-normal"> ({copy.optional})</span>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-bold text-brand-slate mb-1">
          {copy.sectionContact}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-name">
              {copy.customerName} *
            </label>
            <input
              id="cs-name"
              name="customerName"
              value={values.customerName}
              onChange={setField("customerName")}
              className={inputCls}
              autoComplete="name"
              required
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-whatsapp">
              {copy.whatsapp} *
            </label>
            <input
              id="cs-whatsapp"
              name="whatsapp"
              type="tel"
              value={values.whatsapp}
              onChange={setField("whatsapp")}
              className={inputCls}
              placeholder={copy.whatsappPlaceholder}
              autoComplete="tel"
              required
            />
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className={labelCls} htmlFor="cs-country">
              {copy.country} *
            </label>
            <input
              id="cs-country"
              name="country"
              value={values.country}
              onChange={setField("country")}
              className={inputCls}
              autoComplete="country-name"
              required
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-bold text-brand-slate mb-1">
          {copy.sectionVehicle}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-brand">
              {copy.brand} *
            </label>
            <input
              id="cs-brand"
              name="brand"
              value={values.brand}
              onChange={setField("brand")}
              className={inputCls}
              required
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-model">
              {copy.model} *
            </label>
            <input
              id="cs-model"
              name="model"
              value={values.model}
              onChange={setField("model")}
              className={inputCls}
              required
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-budget">
              {copy.budget} *
            </label>
            <input
              id="cs-budget"
              name="budget"
              value={values.budget}
              onChange={setField("budget")}
              className={inputCls}
              placeholder={copy.budgetPlaceholder}
              required
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-qty">
              {copy.quantity} *
            </label>
            <input
              id="cs-qty"
              name="quantity"
              type="number"
              min={1}
              max={999}
              value={values.quantity}
              onChange={setField("quantity")}
              className={inputCls}
              required
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-year">
              {copy.year}
              {optionalMark}
            </label>
            <input
              id="cs-year"
              name="year"
              value={values.year}
              onChange={setField("year")}
              className={inputCls}
              placeholder="e.g. 2018"
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-color">
              {copy.color}
              {optionalMark}
            </label>
            <input
              id="cs-color"
              name="color"
              value={values.color}
              onChange={setField("color")}
              className={inputCls}
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-transmission">
              {copy.transmission}
              {optionalMark}
            </label>
            <select
              id="cs-transmission"
              name="transmission"
              value={values.transmission}
              onChange={setField("transmission")}
              className={inputCls}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {TRANSMISSION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-fuel">
              {copy.fuel}
              {optionalMark}
            </label>
            <select
              id="cs-fuel"
              name="fuel"
              value={values.fuel}
              onChange={setField("fuel")}
              className={inputCls}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {FUEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className={labelCls} htmlFor="cs-drive">
              {copy.drive}
              {optionalMark}
            </label>
            <select
              id="cs-drive"
              name="drive"
              value={values.drive}
              onChange={setField("drive")}
              className={inputCls}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {driveOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-bold text-brand-slate mb-1">
          {copy.sectionShipping}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-dest-country">
              {copy.destinationCountry}
              {optionalMark}
            </label>
            <input
              id="cs-dest-country"
              name="destinationCountry"
              value={values.destinationCountry}
              onChange={setField("destinationCountry")}
              className={inputCls}
            />
          </div>
          <div className="min-w-0">
            <label className={labelCls} htmlFor="cs-dest-port">
              {copy.destinationPort}
              {optionalMark}
            </label>
            <input
              id="cs-dest-port"
              name="destinationPort"
              value={values.destinationPort}
              onChange={setField("destinationPort")}
              className={inputCls}
            />
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className={labelCls} htmlFor="cs-need-shipping">
              {copy.needShipping}
              {optionalMark}
            </label>
            <select
              id="cs-need-shipping"
              name="needShipping"
              value={values.needShipping}
              onChange={setField("needShipping")}
              className={inputCls}
            >
              <option value="">{copy.selectPlaceholder}</option>
              <option value="Yes">{copy.needShippingYes}</option>
              <option value="No">{copy.needShippingNo}</option>
            </select>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className={labelCls} htmlFor="cs-other">
              {copy.otherRequirements}
              {optionalMark}
            </label>
            <textarea
              id="cs-other"
              name="otherRequirements"
              value={values.otherRequirements}
              onChange={setField("otherRequirements")}
              rows={4}
              className={`${inputCls} resize-y min-h-[6rem]`}
            />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full sm:w-auto items-center justify-center min-h-11 px-7 py-3 rounded-xl bg-accent-yellow text-brand-slate text-sm font-semibold hover:bg-accent-yellow-hover transition-colors disabled:opacity-60"
      >
        {busy ? copy.submitting : copy.submit}
      </button>
      <p className="text-xs text-slate-500 leading-relaxed">{copy.privacyNote}</p>
    </form>
  );
}
