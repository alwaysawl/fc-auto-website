import type {
  ShippingDestination,
  ShippingMethodId,
} from "@/data/shippingRates";

export function getCartFreightFromDestinations(
  destinations: ShippingDestination[],
  countryId: string,
  portId: string,
  method: ShippingMethodId = "container"
): { singleVehicle: number; container40ft: number } | null {
  const dest = destinations.find((d) => d.countryId === countryId);
  if (!dest) return null;
  const port = dest.ports.find((p) => p.portId === portId);
  if (!port?.sampleCartFreightUsd) return null;
  const singleVehicle = port.sampleCartFreightUsd.singleVehicle[method];
  const container40ft = port.sampleCartFreightUsd.container40ft[method];
  if (singleVehicle == null || container40ft == null) return null;
  return { singleVehicle, container40ft };
}
