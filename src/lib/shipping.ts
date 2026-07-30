import { Vehicle } from "./types";

export function getShippingPrice(vehicle: Vehicle, quantity: number): number {
  if (quantity <= 0) return 0;
  const sorted = [...vehicle.shippingTiers].sort((a, b) => a.quantity - b.quantity);
  let price = sorted[sorted.length - 1]?.price ?? 0;
  for (const tier of sorted) {
    if (quantity <= tier.quantity) {
      price = tier.price;
      break;
    }
  }
  return price;
}

export function getActiveTierIndex(vehicle: Vehicle, quantity: number): number {
  const sorted = [...vehicle.shippingTiers].sort((a, b) => a.quantity - b.quantity);
  for (let i = 0; i < sorted.length; i++) {
    if (quantity <= sorted[i].quantity) {
      return vehicle.shippingTiers.findIndex(
        (t) => t.quantity === sorted[i].quantity && t.price === sorted[i].price
      );
    }
  }
  return vehicle.shippingTiers.length - 1;
}
