import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getSalesTeamDashboard } from "@/lib/admin/sales-team/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const payload = await getSalesTeamDashboard({
      preset: searchParams.get("preset"),
      start: searchParams.get("start"),
      end: searchParams.get("end"),
    });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[GET /api/admin/sales-team]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "销售团队数据加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}
