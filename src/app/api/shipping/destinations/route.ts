import { NextResponse } from "next/server";
import { CART_EXCLUDED_COUNTRY_IDS } from "@/lib/cart";
import {
  listShippingCountriesWithPorts,
  toCartShippingDestinations,
} from "@/lib/shippingDestinations/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public cart destinations: enabled countries/ports only.
 * Ghana (gh) and Nigeria (ng) stay excluded from cart (intentional).
 */
export async function GET() {
  try {
    const { countries, source, tablesMissing } =
      await listShippingCountriesWithPorts({ enabledOnly: true });
    const destinations = toCartShippingDestinations(countries).filter(
      (d) => !CART_EXCLUDED_COUNTRY_IDS.has(d.countryId)
    );
    return NextResponse.json({ destinations, source, tablesMissing });
  } catch (err) {
    console.error("[GET /api/shipping/destinations]", err);
    return NextResponse.json(
      { error: "Failed to load shipping destinations" },
      { status: 500 }
    );
  }
}
