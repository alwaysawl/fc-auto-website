import { NextResponse } from "next/server";
import {
  dbGetPublicVehicles,
  dbGetPublicVehicleById,
} from "@/lib/supabase/vehicle-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public vehicle list — published (在售) only.
 * Uses an explicit DB column allowlist; VIN/notes are never selected.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (id) {
      const vehicle = await dbGetPublicVehicleById(id);
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
      return NextResponse.json({ vehicle });
    }

    const vehicles = await dbGetPublicVehicles();
    return NextResponse.json({ vehicles });
  } catch (err) {
    console.error("[GET /api/public/vehicles]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load vehicles" }, { status: 500 });
  }
}
