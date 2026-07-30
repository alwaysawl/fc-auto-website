"use client";

import { useState, useMemo } from "react";
import { Vehicle } from "@/lib/types";
import { getShippingPrice, getActiveTierIndex } from "@/lib/shipping";
import { Translations } from "@/lib/translations";
import WhatsAppAssignLink from "@/components/WhatsAppAssignLink";

interface ShippingCalculatorProps {
  vehicles: Vehicle[];
  t: Translations;
  initialVehicleId?: string;
}

export default function ShippingCalculator({
  vehicles,
  t,
  initialVehicleId,
}: ShippingCalculatorProps) {
  const [selectedId, setSelectedId] = useState(
    initialVehicleId && vehicles.find((v) => v.id === initialVehicleId)
      ? initialVehicleId
      : vehicles[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedId),
    [vehicles, selectedId]
  );

  const shippingCost = selectedVehicle
    ? getShippingPrice(selectedVehicle, quantity)
    : 0;

  const activeTierIndex = selectedVehicle
    ? getActiveTierIndex(selectedVehicle, quantity)
    : -1;

  const fobTotal = selectedVehicle ? selectedVehicle.fobPrice * quantity : 0;
  const totalCost = fobTotal + shippingCost;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t.shipping.selectVehicle}
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-dark"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.year}) — {formatPrice(v.fobPrice)} FOB
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t.shipping.quantity}
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 border border-white/10 rounded-sm flex items-center justify-center hover:bg-white/5 text-white text-lg font-bold transition-colors"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={10}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center input-dark"
            />
            <button
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              className="w-10 h-10 border border-white/10 rounded-sm flex items-center justify-center hover:bg-white/5 text-white text-lg font-bold transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {selectedVehicle && (
          <div className="card-premium p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">
                {t.shipping.fobPrice} ({quantity}x)
              </span>
              <span className="font-semibold text-lg text-white">{formatPrice(fobTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t.shipping.shippingCost}</span>
              <span className="font-semibold text-lg text-white">{formatPrice(shippingCost)}</span>
            </div>
            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
              <span className="font-bold text-white">{t.shipping.totalCost}</span>
              <span className="font-bold text-2xl text-gold font-display">{formatPrice(totalCost)}</span>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 italic">{t.shipping.note}</p>

        <WhatsAppAssignLink
          sourcePage="shipping-calculator"
          vehicleTitle={
            selectedVehicle
              ? `${quantity}x ${selectedVehicle.brand} ${selectedVehicle.model}`
              : undefined
          }
          vehicleYear={selectedVehicle ? String(selectedVehicle.year) : undefined}
          stockNumber={
            selectedVehicle
              ? selectedVehicle.vin || selectedVehicle.id
              : undefined
          }
          className="btn-whatsapp w-full text-center"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {t.shipping.getQuote}
        </WhatsAppAssignLink>
      </div>

      {selectedVehicle && (
        <div>
          <h3 className="font-display text-xl font-bold mb-5 text-white">
            {selectedVehicle.brand} {selectedVehicle.model} — {t.shipping.priceTable}
          </h3>
          <div className="border border-white/10 rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-charcoal text-white">
                  <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide">
                    {t.vehicleDetail.quantity}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium uppercase tracking-wide">
                    {t.shipping.shippingCost}
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedVehicle.shippingTiers.map((tier, index) => (
                  <tr
                    key={tier.quantity}
                    className={`${
                      index === activeTierIndex
                        ? "bg-gold/10 border-l-4 border-l-gold"
                        : index % 2 === 0
                        ? "bg-surface-card"
                        : "bg-surface-elevated"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {tier.quantity}{" "}
                      {tier.quantity === 1
                        ? t.vehicleDetail.vehicle
                        : t.vehicleDetail.vehicles}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gold">
                      {formatPrice(tier.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
