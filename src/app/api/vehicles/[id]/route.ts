import { NextResponse } from "next/server";
import {
  dbGetVehicleById,
  dbUpdateVehicle,
  dbDeleteVehicle,
} from "@/lib/supabase/vehicle-queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin/auth";
import type { ShippingTier, Vehicle } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "vehicle-images";
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

/** Extract Storage object path from a public vehicle-images URL. Skip local/mock paths. */
function extractVehicleImagePath(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("blob:") || trimmed.startsWith("/images/")) {
    return null;
  }
  const idx = trimmed.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(trimmed.slice(idx + PUBLIC_MARKER.length));
  } catch {
    return trimmed.slice(idx + PUBLIC_MARKER.length);
  }
}

function collectStoragePaths(vehicle: Vehicle): string[] {
  const urls = [
    vehicle.mainImageUrl,
    ...(vehicle.galleryImageUrls ?? []),
    ...(vehicle.photos ?? []),
  ];
  const paths = new Set<string>();
  for (const url of urls) {
    const path = extractVehicleImagePath(url);
    if (path) paths.add(path);
  }
  return [...paths];
}

/** Admin-only: full vehicle including VIN. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const vehicle = await dbGetVehicleById(id);
    if (!vehicle) {
      return NextResponse.json({ error: "车辆不存在" }, { status: 404 });
    }
    return NextResponse.json(vehicle);
  } catch (err) {
    console.error("[GET /api/vehicles/[id]]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "车辆数据加载失败" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const body = await request.json();

    let updates: Record<string, unknown>;
    if ("shippingTiers" in body && Object.keys(body).length === 1) {
      const { shippingTiers } = body as { shippingTiers: ShippingTier[] };
      if (!Array.isArray(shippingTiers)) {
        return NextResponse.json(
          { error: "shippingTiers 必须为数组" },
          { status: 400 }
        );
      }
      updates = { shippingTiers };
    } else {
      const { id: _ignored, ...rest } = body as { id?: string } & Record<string, unknown>;
      updates = rest;
    }

    const updated = await dbUpdateVehicle(
      id,
      updates as Parameters<typeof dbUpdateVehicle>[1]
    );
    if (!updated) {
      return NextResponse.json({ error: "车辆不存在" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新车辆失败";
    console.error("[PUT /api/vehicles/[id]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const vehicle = await dbGetVehicleById(id);
    if (!vehicle) {
      return NextResponse.json({ error: "车辆不存在" }, { status: 404 });
    }

    const storagePaths = collectStoragePaths(vehicle);
    let storageWarning: string | undefined;
    let removedCount = 0;

    if (storagePaths.length > 0) {
      try {
        const supabase = getSupabaseAdmin();
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove(storagePaths);

        if (storageError) {
          console.error(
            "[DELETE /api/vehicles/[id]] storage cleanup:",
            storageError.message
          );
          storageWarning = `数据库记录已删除，但部分 Storage 文件未能清理（${storageError.message}），可能残留孤儿文件。`;
        } else {
          removedCount = storagePaths.length;
        }
      } catch (err) {
        console.error(
          "[DELETE /api/vehicles/[id]] storage cleanup exception:",
          err instanceof Error ? err.message : err
        );
        storageWarning =
          "数据库记录已删除，但 Storage 清理失败，可能残留孤儿文件。";
      }
    }

    const ok = await dbDeleteVehicle(id);
    if (!ok) {
      return NextResponse.json({ error: "删除车辆失败" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      storageRemoved: removedCount,
      storageWarning,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除车辆失败";
    console.error("[DELETE /api/vehicles/[id]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
