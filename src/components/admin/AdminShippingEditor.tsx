"use client";

import { useState, useEffect } from "react";
import { Vehicle, ShippingTier } from "@/lib/types";

export default function AdminShippingEditor() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [tiers, setTiers] = useState<ShippingTier[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((data) => {
        setVehicles(data.vehicles);
        if (data.vehicles.length > 0) {
          setSelectedId(data.vehicles[0].id);
          setTiers(data.vehicles[0].shippingTiers);
        }
      });
  }, []);

  const handleVehicleChange = (id: string) => {
    setSelectedId(id);
    const vehicle = vehicles.find((v) => v.id === id);
    if (vehicle) {
      setTiers([...vehicle.shippingTiers]);
    }
    setMessage("");
  };

  const updateTier = (index: number, field: "quantity" | "price", value: number) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const addTier = () => {
    const lastQty = tiers.length > 0 ? tiers[tiers.length - 1].quantity : 0;
    setTiers([...tiers, { quantity: lastQty + 1, price: 0 }]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/vehicles/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingTiers: tiers }),
      });
      if (res.ok) {
        const updated = await res.json();
        setVehicles(vehicles.map((v) => (v.id === selectedId ? updated : v)));
        setMessage("Shipping prices saved successfully!");
      } else {
        setMessage("Failed to save. Please try again.");
      }
    } catch {
      setMessage("Failed to save. Please try again.");
    }
    setSaving(false);
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Vehicle
        </label>
        <select
          value={selectedId}
          onChange={(e) => handleVehicleChange(e.target.value)}
          className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-sm bg-white focus:ring-2 focus:ring-gold focus:border-gold outline-none"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model} ({v.year})
            </option>
          ))}
        </select>
      </div>

      {selectedVehicle && (
        <>
          <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
            <div className="bg-charcoal text-white px-4 py-3 flex justify-between items-center">
              <h3 className="font-semibold">
                {selectedVehicle.brand} {selectedVehicle.model} — Shipping Price Table
              </h3>
              <button
                onClick={addTier}
                className="text-sm bg-gold text-charcoal px-3 py-1 rounded-sm hover:bg-gold-light transition-colors font-medium"
              >
                + Add Tier
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Quantity (up to)
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Shipping Price ($)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        value={tier.quantity}
                        onChange={(e) =>
                          updateTier(index, "quantity", parseInt(e.target.value) || 1)
                        }
                        className="w-24 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        vehicle{tier.quantity > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          min={0}
                          value={tier.price}
                          onChange={(e) =>
                            updateTier(index, "price", parseInt(e.target.value) || 0)
                          }
                          className="w-32 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gold focus:border-gold outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeTier(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Shipping Prices"}
            </button>
            {message && (
              <span
                className={`text-sm ${
                  message.includes("success") ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </span>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-sm text-blue-800">
            <strong>How tier pricing works:</strong> When a customer selects a quantity,
            the system finds the smallest tier where quantity ≤ tier quantity and uses
            that price. For example, if tiers are 1=$1200, 2=$2200, 3=$2200, then
            ordering 2 or 3 vehicles both cost $2200 shipping (not multiplied).
          </div>
        </>
      )}
    </div>
  );
}
