import type {
  ShippingDestination,
  ShippingMethodId,
} from "@/data/shippingRates";

/** Stable ID compare for country_id / port_id (trim + lowercase). */
export function normalizeShippingId(id: string): string {
  return id.trim().toLowerCase();
}

export function findCartDestination(
  destinations: ShippingDestination[],
  countryId: string
): ShippingDestination | undefined {
  const cid = normalizeShippingId(countryId);
  if (!cid) return undefined;
  return destinations.find((d) => normalizeShippingId(d.countryId) === cid);
}

export function findCartPort(
  destination: ShippingDestination,
  portId: string
) {
  const pid = normalizeShippingId(portId);
  if (!pid) return undefined;
  return destination.ports.find((p) => normalizeShippingId(p.portId) === pid);
}

/**
 * Look up cart freight rates by stable country_id + port_id.
 * Returns null when the destination/port is missing or rates are non-finite.
 * A configured-but-zero rate pair is returned as {0,0} so callers can show
 * “pending confirmation” instead of a fake $0 quote.
 */
export function getCartFreightFromDestinations(
  destinations: ShippingDestination[],
  countryId: string,
  portId: string,
  method: ShippingMethodId = "container"
): { singleVehicle: number; container40ft: number } | null {
  const dest = findCartDestination(destinations, countryId);
  if (!dest) return null;
  const port = findCartPort(dest, portId);
  if (!port?.sampleCartFreightUsd) return null;

  const singleRaw = port.sampleCartFreightUsd.singleVehicle[method];
  const containerRaw = port.sampleCartFreightUsd.container40ft[method];
  const singleVehicle = Number(singleRaw);
  const container40ft = Number(containerRaw);
  if (!Number.isFinite(singleVehicle) || !Number.isFinite(container40ft)) {
    return null;
  }
  return { singleVehicle, container40ft };
}

/** True when at least one saved freight rate is positive. */
export function isCartFreightConfigured(
  rates: { singleVehicle: number; container40ft: number } | null
): boolean {
  if (!rates) return false;
  return rates.singleVehicle > 0 || rates.container40ft > 0;
}
