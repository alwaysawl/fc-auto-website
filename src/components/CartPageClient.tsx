"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { Locale } from "@/lib/types";
import type { Translations } from "@/lib/translations";
import { getLocalizedPath } from "@/lib/i18n";
import { useCart } from "@/components/CartProvider";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";
import {
  VEHICLE_TYPES,
  findDestination,
  findPort,
  getCartSampleFreightUsd,
  getLocalizedName,
  type VehicleTypeId,
} from "@/data/shippingRates";
import {
  CART_SHIPPING_DESTINATIONS,
  formatUsd,
  isCartDestinationAllowed,
  type ShippingArrangementId,
} from "@/lib/cart";
import {
  buildWhatsAppFreightSummary,
  calculateGroupedFreight,
} from "@/lib/cartFreight";

interface CartPageClientProps {
  locale: Locale;
  t: Translations;
}

export default function CartPageClient({ locale, t }: CartPageClientProps) {
  const {
    items,
    shipping,
    setShipping,
    removeItem,
    setItemVehicleType,
    showToast,
    ready,
  } = useCart();

  const arrangement: ShippingArrangementId =
    shipping.arrangement === "own_agent" ? "own_agent" : "fc_auto";
  const isOwnAgent = arrangement === "own_agent";
  const isFcAuto = !isOwnAgent;

  useEffect(() => {
    if (!ready) return;
    if (shipping.countryId && !isCartDestinationAllowed(shipping.countryId)) {
      setShipping({ countryId: "", portId: "" });
    }
  }, [ready, shipping.countryId, setShipping]);

  // Cart only supports container shipping — keep stored method in sync
  useEffect(() => {
    if (!ready) return;
    if (shipping.method !== "container") {
      setShipping({ method: "container" });
    }
  }, [ready, shipping.method, setShipping]);

  // Backfill arrangement for older localStorage payloads
  useEffect(() => {
    if (!ready) return;
    if (
      shipping.arrangement !== "fc_auto" &&
      shipping.arrangement !== "own_agent"
    ) {
      setShipping({ arrangement: "fc_auto" });
    }
  }, [ready, shipping.arrangement, setShipping]);

  const nameLocale = locale === "fr" || locale === "zh" ? locale : "en";
  const safeCountryId = isCartDestinationAllowed(shipping.countryId)
    ? shipping.countryId
    : "";
  const destination = safeCountryId
    ? findDestination(safeCountryId)
    : undefined;
  const ports = destination?.ports ?? [];
  const port =
    destination && shipping.portId
      ? findPort(destination, shipping.portId)
      : undefined;

  const vehicleCount = items.length;

  const freightLabels = useMemo(
    () => ({
      freightCalcSingle: t.cart.freightCalcSingle,
      freightCalcOneContainer: t.cart.freightCalcOneContainer,
      freightCalcManyContainers: t.cart.freightCalcManyContainers,
      freightCalcOneContainerPlusSingle:
        t.cart.freightCalcOneContainerPlusSingle,
      freightCalcManyContainersPlusSingle:
        t.cart.freightCalcManyContainersPlusSingle,
    }),
    [t.cart]
  );

  const routeRates = useMemo(() => {
    if (!isFcAuto) return null;
    if (!safeCountryId || !shipping.portId) return null;
    return getCartSampleFreightUsd(
      safeCountryId,
      shipping.portId,
      "container"
    );
  }, [isFcAuto, safeCountryId, shipping.portId]);

  const groupedFreight = useMemo(() => {
    if (!isFcAuto || !routeRates || vehicleCount === 0) return null;
    return calculateGroupedFreight(
      vehicleCount,
      routeRates.singleVehicle,
      routeRates.container40ft,
      freightLabels
    );
  }, [isFcAuto, routeRates, vehicleCount, freightLabels]);

  const lines = useMemo(() => {
    return items.map((item) => {
      const freight =
        isFcAuto && vehicleCount === 1 && groupedFreight
          ? groupedFreight.totalFreight
          : null;
      const subtotal =
        freight != null ? item.fobPrice + freight : item.fobPrice;
      return { item, freight, subtotal };
    });
  }, [items, vehicleCount, groupedFreight, isFcAuto]);

  const vehicleTotal = lines.reduce((sum, line) => sum + line.item.fobPrice, 0);
  const shippingTotal = isFcAuto
    ? (groupedFreight?.totalFreight ?? null)
    : null;
  const grandTotal = isOwnAgent
    ? vehicleTotal
    : shippingTotal != null
      ? vehicleTotal + shippingTotal
      : null;

  const countryLabel = destination
    ? getLocalizedName(destination.countryName, nameLocale)
    : "";
  const portLabel = port
    ? getLocalizedName(port.portName, nameLocale)
    : "";
  const methodLabel = t.shipping.methods.container;

  const inquiryNote = useMemo(() => {
    if (items.length === 0) return undefined;

    if (isOwnAgent) {
      const fob = `USD ${vehicleTotal.toLocaleString("en-US")}`;
      const countryDisplay =
        countryLabel ||
        (locale === "zh"
          ? "可选"
          : locale === "fr"
            ? "Facultatif"
            : "Optional");
      const portDisplay =
        portLabel ||
        (locale === "zh"
          ? "可选"
          : locale === "fr"
            ? "Facultatif"
            : "Optional");

      if (locale === "zh") {
        return [
          "我想获取报价。",
          "",
          "车辆清单",
          "",
          ...lines.flatMap(({ item }, index) => [
            `${index + 1}.`,
            item.title,
            "库存编号",
            item.id,
            "FOB",
            `USD ${item.fobPrice.toLocaleString("en-US")}`,
            "",
          ]),
          `运输安排：${t.cart.arrangementOwnAgent}`,
          `运费：由客户代理安排`,
          `车辆 FOB 总价：${fob}`,
          `目的国家：${countryDisplay}`,
          `目的港口：${portDisplay}`,
          "",
          t.cart.waOwnAgentConfirm,
        ].join("\n");
      }

      if (locale === "fr") {
        return [
          "Je souhaite un devis.",
          "",
          "Véhicules",
          "",
          ...lines.flatMap(({ item }, index) => [
            `${index + 1}.`,
            item.title,
            "N° de stock",
            item.id,
            "FOB",
            `USD ${item.fobPrice.toLocaleString("en-US")}`,
            "",
          ]),
          `Organisation du transport : ${t.cart.arrangementOwnAgent}`,
          `Fret : Organisé par l'agent du client`,
          `Total FOB des véhicules : ${vehicleTotal.toLocaleString("fr-FR")} USD`,
          `Pays de destination : ${countryDisplay}`,
          `Port de destination : ${portDisplay}`,
          "",
          t.cart.waOwnAgentConfirm,
        ].join("\n");
      }

      return [
        "I would like a quotation.",
        "",
        "Vehicles",
        "",
        ...lines.flatMap(({ item }, index) => [
          `${index + 1}.`,
          item.title,
          "Stock ID",
          item.id,
          "FOB",
          `USD ${item.fobPrice.toLocaleString("en-US")}`,
          "",
        ]),
        `Shipping arrangement: ${t.cart.arrangementOwnAgent}`,
        `Freight: Arranged by customer's agent`,
        `Vehicle FOB total: ${fob}`,
        `Destination country: ${countryDisplay}`,
        `Destination port: ${portDisplay}`,
        "",
        t.cart.waOwnAgentConfirm,
      ].join("\n");
    }

    const linesOut: string[] = [
      "I would like a quotation.",
      "",
      `Shipping arrangement: ${t.cart.arrangementFcAuto}`,
      "",
      "Vehicles",
      "",
    ];

    lines.forEach(({ item }, index) => {
      linesOut.push(`${index + 1}.`);
      linesOut.push(item.title);
      linesOut.push(`Stock ID`);
      linesOut.push(item.id);
      linesOut.push(`FOB`);
      linesOut.push(`USD ${item.fobPrice.toLocaleString("en-US")}`);
      linesOut.push("");
    });

    if (countryLabel) {
      linesOut.push(`Destination Country`);
      linesOut.push(countryLabel);
    }
    if (portLabel) {
      linesOut.push(`Destination Port`);
      linesOut.push(portLabel);
    }
    linesOut.push(`Shipping Method`);
    linesOut.push(methodLabel);
    linesOut.push("");

    if (groupedFreight) {
      linesOut.push(...buildWhatsAppFreightSummary(groupedFreight, locale));
      linesOut.push(
        `40-foot containers: ${groupedFreight.fullContainerCount}`
      );
      linesOut.push(
        `Single-vehicle charges: ${groupedFreight.singleVehicleCount}`
      );
      linesOut.push("");
    }

    linesOut.push(`Vehicle Total`);
    linesOut.push(`USD ${vehicleTotal.toLocaleString("en-US")}`);
    if (shippingTotal != null) {
      linesOut.push(`Estimated Freight`);
      linesOut.push(`USD ${shippingTotal.toLocaleString("en-US")}`);
    }
    if (grandTotal != null) {
      linesOut.push(`Estimated Total`);
      linesOut.push(`USD ${grandTotal.toLocaleString("en-US")}`);
    }
    linesOut.push("");
    linesOut.push("Please send me the final quotation.");
    linesOut.push(t.cart.finalConfirmationWhatsApp);
    return linesOut.join("\n");
  }, [
    t.cart,
    items,
    lines,
    countryLabel,
    portLabel,
    methodLabel,
    vehicleTotal,
    shippingTotal,
    grandTotal,
    groupedFreight,
    locale,
    isOwnAgent,
  ]);

  const fieldClass =
    "w-full min-h-11 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow text-brand-slate";

  const arrangementOptions: {
    id: ShippingArrangementId;
    label: string;
  }[] = [
    { id: "fc_auto", label: t.cart.arrangementFcAuto },
    { id: "own_agent", label: t.cart.arrangementOwnAgent },
  ];

  if (!ready) {
    return (
      <p className="text-center text-slate-500 py-20">{t.common.loading}</p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20 px-4 bg-slate-50 rounded-2xl border border-slate-100">
        <p className="text-brand-slate font-semibold text-lg mb-2">
          {t.cart.emptyTitle}
        </p>
        <p className="text-slate-500 text-sm mb-6">{t.cart.emptySubtitle}</p>
        <Link
          href={getLocalizedPath("/inventory", locale)}
          className="inline-flex min-h-11 items-center justify-center px-5 rounded-lg bg-accent-yellow text-brand-slate font-semibold text-sm hover:bg-accent-yellow-hover transition-colors"
        >
          {t.cart.browseInventory}
        </Link>
      </div>
    );
  }

  const stickyTotal = isOwnAgent
    ? vehicleTotal
    : grandTotal != null
      ? grandTotal
      : vehicleTotal;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 xl:gap-8 items-start pb-24 xl:pb-0">
      <div className="space-y-5 min-w-0">
        {/* Shipping selectors */}
        <section className="bg-white border border-slate-100 rounded-2xl shadow-soft p-4 sm:p-5">
          <h2 className="text-base font-bold text-brand-slate mb-4">
            {t.cart.shippingOptions}
          </h2>

          <fieldset className="mb-5 min-w-0">
            <legend className="block text-sm font-bold text-brand-slate mb-2.5">
              {t.cart.shippingArrangement}
            </legend>
            <div className="grid grid-cols-1 gap-2.5">
              {arrangementOptions.map((opt) => {
                const selected = arrangement === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShipping({ arrangement: opt.id })}
                    className={`w-full min-h-12 text-left rounded-xl border px-3.5 py-3 transition-colors ${
                      selected
                        ? "bg-brand-slate text-white border-brand-slate"
                        : "bg-white text-brand-slate border-slate-200 hover:border-brand-slate/40"
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="flex items-start gap-3 min-w-0">
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          selected
                            ? "border-accent-yellow bg-accent-yellow"
                            : "border-slate-300 bg-white"
                        }`}
                        aria-hidden
                      >
                        {selected && (
                          <span className="h-2 w-2 rounded-full bg-brand-slate" />
                        )}
                      </span>
                      <span
                        className="text-sm font-semibold leading-snug break-words"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {opt.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {isOwnAgent
                  ? t.cart.destinationCountryOptional
                  : t.shipping.destinationCountry}
              </label>
              <select
                value={safeCountryId}
                onChange={(e) => setShipping({ countryId: e.target.value })}
                className={fieldClass}
              >
                <option value="">{t.shipping.selectCountry}</option>
                {CART_SHIPPING_DESTINATIONS.map((d) => (
                  <option key={d.countryId} value={d.countryId}>
                    {getLocalizedName(d.countryName, nameLocale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {isOwnAgent
                  ? t.cart.destinationPortOptional
                  : t.shipping.destinationPort}
              </label>
              <select
                value={shipping.portId}
                onChange={(e) => setShipping({ portId: e.target.value })}
                className={fieldClass}
                disabled={!safeCountryId}
              >
                <option value="">{t.shipping.selectPort}</option>
                {ports.map((p) => (
                  <option key={p.portId} value={p.portId}>
                    {getLocalizedName(p.portName, nameLocale)}
                  </option>
                ))}
              </select>
            </div>

            {isFcAuto && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  {t.cart.shippingMethodLabel}
                </label>
                <div
                  className={`${fieldClass} flex items-center bg-slate-50 text-brand-slate cursor-default`}
                  aria-readonly="true"
                >
                  {t.cart.containerShippingOnly}
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed break-words">
                  {t.cart.containerShippingNotice}
                </p>
              </div>
            )}
          </div>

          {isOwnAgent && (
            <div
              role="note"
              className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950"
            >
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                className="min-w-0 leading-relaxed break-words"
                style={{ overflowWrap: "anywhere" }}
              >
                {t.cart.ownAgentNotice}
              </p>
            </div>
          )}

          {isFcAuto && vehicleCount > 1 && (
            <div
              role="note"
              className="mt-4 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm text-sky-950"
            >
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-600"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="min-w-0 space-y-2">
                <p className="leading-relaxed break-words">
                  {t.cart.multiVehicleFreightNotice}
                </p>
                <p className="text-xs font-medium text-sky-800/90 leading-relaxed break-words">
                  {t.cart.capacityDisclaimer}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Cart items */}
        <ul className="space-y-4">
          {lines.map(({ item, freight, subtotal }) => (
            <li
              key={item.id}
              className="bg-white border border-slate-100 rounded-2xl shadow-soft overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-0 sm:gap-4">
                <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[140px] bg-slate-100">
                  <Image
                    src={item.photo}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 140px"
                  />
                </div>
                <div className="p-4 sm:pr-5 sm:py-4 min-w-0 overflow-x-hidden">
                  <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-bold text-brand-slate text-base break-words"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {item.title}
                      </h3>
                      <p
                        className="text-sm text-slate-500 mt-0.5 break-words"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {item.year} · {t.cart.stockId}: {item.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeItem(item.id);
                        showToast(t.cart.removedToast);
                      }}
                      aria-label={`Remove ${item.title} from cart`}
                      className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto flex-shrink-0 px-4 rounded-lg border border-red-300 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 hover:text-red-700 active:bg-red-100 transition-colors"
                    >
                      <span aria-hidden>🗑</span>
                      <span className="whitespace-normal break-words text-center leading-tight">
                        {t.cart.removeFromCart}
                      </span>
                    </button>
                  </div>

                  <div className="mb-3 max-w-full sm:max-w-xs">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.shipping.vehicleType}
                    </label>
                    <select
                      value={item.vehicleTypeId}
                      onChange={(e) =>
                        setItemVehicleType(
                          item.id,
                          e.target.value as VehicleTypeId
                        )
                      }
                      className={fieldClass}
                    >
                      {VEHICLE_TYPES.map((id) => (
                        <option key={id} value={id}>
                          {t.shipping.vehicleTypes[id]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <dl
                    className={`grid gap-2 text-sm mb-4 ${
                      isFcAuto && vehicleCount === 1
                        ? "grid-cols-1 min-[400px]:grid-cols-3"
                        : "grid-cols-1"
                    }`}
                  >
                    <div className="rounded-lg bg-slate-50 px-3 py-2 min-w-0">
                      <dt className="text-[11px] text-slate-500 font-semibold break-words">
                        {t.cart.fobChina}
                      </dt>
                      <dd className="font-bold text-brand-slate mt-0.5 break-words">
                        {formatUsd(item.fobPrice)}
                      </dd>
                    </div>
                    {isFcAuto && vehicleCount === 1 && (
                      <>
                        <div className="rounded-lg bg-slate-50 px-3 py-2 min-w-0">
                          <dt className="text-[11px] text-slate-500 font-semibold break-words">
                            {t.cart.estimatedFreight}
                          </dt>
                          <dd className="font-bold text-brand-slate mt-0.5 break-words">
                            {freight != null ? formatUsd(freight) : "—"}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-accent-yellow/15 px-3 py-2 min-w-0">
                          <dt className="text-[11px] text-slate-600 font-semibold break-words">
                            {t.cart.subtotal}
                          </dt>
                          <dd className="font-bold text-brand-slate mt-0.5 break-words">
                            {subtotal != null ? formatUsd(subtotal) : "—"}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>

                  <Link
                    href={getLocalizedPath(`/inventory/${item.id}`, locale)}
                    className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center px-4 rounded-lg border border-slate-200 text-sm font-semibold text-brand-slate hover:bg-slate-50 transition-colors"
                  >
                    {t.cart.viewDetails}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary */}
      <aside className="xl:sticky xl:top-24">
        <div className="bg-brand-slate text-white rounded-2xl shadow-elevated p-5 sm:p-6">
          <h2 className="text-lg font-bold mb-4">{t.cart.summaryTitle}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-white/70">{t.cart.vehicleTotal}</dt>
              <dd className="font-semibold">{formatUsd(vehicleTotal)}</dd>
            </div>

            {isOwnAgent ? (
              <>
                <div className="rounded-lg bg-white/10 px-3 py-2.5 space-y-1 min-w-0">
                  <dt className="text-white/70 text-xs font-semibold">
                    {t.cart.shippingArrangement}
                  </dt>
                  <dd
                    className="font-semibold text-accent-yellow break-words leading-snug"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {t.cart.arrangementOwnAgentSummary}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 items-start min-w-0">
                  <dt className="text-white/70 flex-shrink-0">
                    {t.cart.shippingTotal}
                  </dt>
                  <dd
                    className="font-semibold text-right break-words"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {t.cart.freightCustomerAgentShort}
                  </dd>
                </div>
                <div className="border-t border-white/15 pt-3 space-y-1">
                  <div className="flex justify-between gap-3 items-baseline">
                    <dt className="font-semibold">{t.cart.estimatedTotal}</dt>
                    <dd className="text-xl font-bold text-accent-yellow">
                      {formatUsd(vehicleTotal)}
                    </dd>
                  </div>
                  <p className="text-[11px] text-white/60 break-words">
                    {t.cart.estimatedTotalFobOnly}
                  </p>
                </div>
              </>
            ) : (
              <>
                {groupedFreight && (
                  <div className="rounded-lg bg-white/10 px-3 py-2.5 space-y-1">
                    <dt className="text-white/70 text-xs font-semibold">
                      {t.cart.freightCalculation}
                    </dt>
                    <dd className="font-semibold text-accent-yellow break-words leading-snug">
                      {groupedFreight.calculationLabel}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-white/70">{t.cart.shippingTotal}</dt>
                  <dd className="font-semibold">
                    {shippingTotal != null ? formatUsd(shippingTotal) : "—"}
                  </dd>
                </div>
                <div className="border-t border-white/15 pt-3 flex justify-between gap-3 items-baseline">
                  <dt className="font-semibold">{t.cart.estimatedTotal}</dt>
                  <dd className="text-xl font-bold text-accent-yellow">
                    {grandTotal != null ? formatUsd(grandTotal) : "—"}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {isFcAuto && vehicleCount > 1 && (
            <p className="mt-3 text-[11px] text-white/60 leading-relaxed break-words">
              {t.cart.capacityDisclaimer}
            </p>
          )}

          {isFcAuto && (
            <p className="mt-4 text-xs text-white/65 leading-relaxed whitespace-pre-line">
              {t.cart.estimateNote}
            </p>
          )}

          {isFcAuto && (
            <div
              role="note"
              className="mt-4 flex gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 text-[14px] leading-relaxed text-white/90 min-w-0"
            >
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-yellow"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                className="min-w-0 break-words"
                style={{ overflowWrap: "anywhere" }}
              >
                {t.cart.finalConfirmationPrefix}
                <span className="font-semibold text-accent-yellow">
                  {t.cart.finalConfirmationHighlight}
                </span>
              </p>
            </div>
          )}

          {isOwnAgent && (
            <div
              role="note"
              className="mt-4 flex gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 text-[14px] leading-relaxed text-white/90 min-w-0"
            >
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-yellow"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                className="min-w-0 break-words"
                style={{ overflowWrap: "anywhere" }}
              >
                {t.cart.freightByCustomerAgent}
              </p>
            </div>
          )}

          <WhatsAppAssignLink
            sourcePage="cart-checkout"
            inquiryNote={inquiryNote}
            className="mt-5 w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#20BD5A] transition-colors px-4 text-center"
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t.cart.sendWhatsApp}
          </WhatsAppAssignLink>

          <div className="h-2 xl:hidden" />
        </div>
      </aside>

      {/* Mobile sticky summary bar */}
      <div className="xl:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur safe-area-pb px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-semibold">
              {t.cart.estimatedTotal}
            </p>
            <p className="text-lg font-bold text-brand-slate truncate">
              {formatUsd(stickyTotal)}
            </p>
          </div>
          <WhatsAppAssignLink
            sourcePage="cart-checkout-mobile"
            inquiryNote={inquiryNote}
            className="min-h-11 flex-shrink-0 inline-flex items-center justify-center px-4 rounded-lg bg-[#25D366] text-white text-sm font-bold"
          >
            {t.cart.sendWhatsApp}
          </WhatsAppAssignLink>
        </div>
      </div>
    </div>
  );
}
