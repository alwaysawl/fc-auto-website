import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { resolveStatisticsRange } from "@/lib/admin/statistics";
import type { StatisticsRangePreset } from "@/lib/admin/statistics-types";
import { getVehicleHeatDetail } from "@/lib/analytics/vehicle-heat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId")?.trim();
    if (!vehicleId) {
      return NextResponse.json({ error: "缺少车辆 ID" }, { status: 400 });
    }
    const presetRaw = (searchParams.get("preset") ?? "30d") as StatisticsRangePreset;
    const preset: StatisticsRangePreset = [
      "today",
      "7d",
      "30d",
      "month",
      "custom",
    ].includes(presetRaw)
      ? presetRaw
      : "30d";
    const range = resolveStatisticsRange(
      preset,
      searchParams.get("start"),
      searchParams.get("end")
    );
    const detail = await getVehicleHeatDetail(vehicleId, range);
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[GET /api/admin/statistics/vehicle-heat]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "车辆热度数据加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}
