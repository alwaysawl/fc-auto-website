import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getAdminStatistics } from "@/lib/admin/statistics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const payload = await getAdminStatistics({
      preset: searchParams.get("preset"),
      start: searchParams.get("start"),
      end: searchParams.get("end"),
      source: searchParams.get("source"),
      device: searchParams.get("device"),
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/statistics]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "数据加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}
