"use client";

import { useState, useEffect } from "react";
import { Vehicle } from "@/lib/types";

export default function AdminVehicleEditor() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<Partial<Vehicle>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/vehicles", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setVehicles(data.vehicles);
        if (data.vehicles.length > 0) {
          setSelectedId(data.vehicles[0].id);
          setForm(data.vehicles[0]);
        }
      });
  }, []);

  const handleVehicleChange = (id: string) => {
    setSelectedId(id);
    const vehicle = vehicles.find((v) => v.id === id);
    if (vehicle) setForm({ ...vehicle });
    setMessage("");
  };

  const handleChange = (field: keyof Vehicle, value: string | number | boolean) => {
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: selectedId, ...form }),
      });
      if (res.ok) {
        const updated = await res.json();
        setVehicles(vehicles.map((v) => (v.id === selectedId ? updated : v)));
        setMessage("Vehicle updated successfully!");
      } else {
        setMessage("Failed to save.");
      }
    } catch {
      setMessage("Failed to save.");
    }
    setSaving(false);
  };

  const fields: { key: keyof Vehicle; label: string; type: string }[] = [
    { key: "brand", label: "Brand", type: "text" },
    { key: "model", label: "Model", type: "text" },
    { key: "year", label: "Year", type: "number" },
    { key: "mileage", label: "Mileage (km)", type: "number" },
    { key: "fuel", label: "Fuel", type: "text" },
    { key: "transmission", label: "Transmission", type: "text" },
    { key: "steering", label: "Steering", type: "text" },
    { key: "vin", label: "VIN", type: "text" },
    { key: "fobPrice", label: "FOB Price ($)", type: "number" },
  ];

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

      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                type={type}
                value={(form[key] as string | number) ?? ""}
                onChange={(e) =>
                  handleChange(
                    key,
                    type === "number" ? parseInt(e.target.value) || 0 : e.target.value
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={form.featured ?? false}
              onChange={(e) => handleChange("featured", e.target.checked)}
              className="w-4 h-4 text-gold focus:ring-gold"
            />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">
              Featured on Homepage
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Vehicle"}
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
    </div>
  );
}
