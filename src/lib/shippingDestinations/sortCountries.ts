import type { ShippingCountryWithPorts } from "@/lib/shippingDestinations/types";

/** Client-safe sort: display_order, then English name. */
export function sortShippingCountries(
  list: ShippingCountryWithPorts[]
): ShippingCountryWithPorts[] {
  return [...list].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.name_en.localeCompare(b.name_en, "en", { sensitivity: "base" });
  });
}
