import { NextResponse } from "next/server";
import { dbGetAllVehicles, dbCreateVehicle, dbUpdateVehicle } from "@/lib/supabase/vehicle-queries";
import { requireAdminApi } from "@/lib/admin/auth";
import type { Vehicle } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: full vehicle rows including VIN. Unauthenticated → 401. */
export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const vehicles = await dbGetAllVehicles();
    return NextResponse.json({ vehicles });
  } catch (err) {
    console.error("[GET /api/vehicles]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "车辆数据加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const vehicle = body as Vehicle;

    if (!vehicle.id?.trim() || !vehicle.brand?.trim() || !vehicle.model?.trim()) {
      return NextResponse.json(
        { error: "库存编号、品牌和车型为必填项" },
        { status: 400 }
      );
    }

    const created = await dbCreateVehicle(vehicle);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建车辆失败";
    console.error("[POST /api/vehicles]", message);
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string } & Partial<Vehicle>;

    if (!id) {
      return NextResponse.json({ error: "缺少车辆 ID" }, { status: 400 });
    }

    const updated = await dbUpdateVehicle(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "车辆不存在" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新车辆失败";
    console.error("[PUT /api/vehicles]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
