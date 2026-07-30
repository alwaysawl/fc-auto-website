import type { Vehicle } from "@/lib/types";
import type { ShippingMethodId, VehicleTypeId } from "@/data/shippingRates";

export const CART_STORAGE_KEY = "fc-auto-export-cart-v1";
export const CART_SHIPPING_STORAGE_KEY = "fc-auto-export-cart-shipping-v1";

export type CartItem = {
  id: string;
  brand: string;
  model: string;
  year: number;
  fobPrice: number;
  currency: string;
  /** Display label (e.g. SUV, Sedan) */
  bodyType: string;
  /** Shipping calculator vehicle type */
  vehicleTypeId: VehicleTypeId;
  photo: string;
  title: string;
};

export type CartShippingSelection = {
  countryId: string;
  portId: string;
  method: ShippingMethodId;
};

export function inferDisplayBodyType(vehicle: Vehicle): string {
  if (vehicle.bodyType?.trim()) return vehicle.bodyType.trim();
  const name = `${vehicle.brand} ${vehicle.model}`.toLowerCase();
  if (name.includes("hilux") || name.includes("pickup") || name.includes("ranger")) {
    return "Pickup";
  }
  if (name.includes("corolla") || name.includes("camry") || name.includes("sedan")) {
    return "Sedan";
  }
  if (
    name.includes("rav4") ||
    name.includes("prado") ||
    name.includes("cr-v") ||
    name.includes("x-trail") ||
    name.includes("glc") ||
    name.includes("x7") ||
    name.includes("land cruiser") ||
    name.includes("suv")
  ) {
    return "SUV";
  }
  if (name.includes("alphard") || name.includes("sienna") || name.includes("minivan")) {
    return "Minivan";
  }
  if (name.includes("hiace") || name.includes("van")) {
    return "Van";
  }
  return "Other";
}

export function mapToVehicleTypeId(bodyOrType: string): VehicleTypeId {
  const key = bodyOrType.trim().toLowerCase();
  if (key.includes("pickup") || key.includes("pick-up") || key.includes("皮卡")) {
    return "pickup";
  }
  if (key.includes("suv") || key.includes("crossover")) return "suv";
  if (key.includes("minivan") || key.includes("mpv") || key.includes("alphard")) {
    return "minivan";
  }
  if (key.includes("van") || key.includes("hiace") || key.includes("厢式")) return "van";
  if (key.includes("sedan") || key.includes("berline") || key.includes("轿车")) {
    return "sedan";
  }
  return "suv";
}

export function vehicleToCartItem(vehicle: Vehicle): CartItem {
  const bodyType = inferDisplayBodyType(vehicle);
  const photo =
    vehicle.mainImageUrl?.trim() ||
    vehicle.photos?.[0] ||
    "/images/rav4.jpg";
  const title =
    vehicle.titleEn?.trim() || `${vehicle.brand} ${vehicle.model}`;

  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    fobPrice: vehicle.fobPrice,
    currency: vehicle.currency || "USD",
    bodyType,
    vehicleTypeId: mapToVehicleTypeId(bodyType),
    photo,
    title,
  };
}

export function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

export function writeCartToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function readCartShippingFromStorage(): CartShippingSelection {
  const fallback: CartShippingSelection = {
    countryId: "",
    portId: "",
    method: "roro",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(CART_SHIPPING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CartShippingSelection>;
    return {
      countryId: parsed.countryId ?? "",
      portId: parsed.portId ?? "",
      method: parsed.method === "container" ? "container" : "roro",
    };
  } catch {
    return fallback;
  }
}

export function writeCartShippingToStorage(selection: CartShippingSelection): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CART_SHIPPING_STORAGE_KEY,
    JSON.stringify(selection)
  );
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
