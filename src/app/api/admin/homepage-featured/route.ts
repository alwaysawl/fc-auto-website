import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  dbGetHomepageFeaturedVehicles,
  dbReorderHomepageFeatured,
  dbSearchHomepageFeaturedCandidates,
  dbSetHomepageFeatured,
} from "@/lib/supabase/vehicle-queries";
import { HOMEPAGE_SHOWCASE_LIMIT } from "@/lib/homepage-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only homepage featured list.
 * GET ?candidates=1&q=... → searchable 在售 vehicles not yet featured
 * GET (default) → current featured vehicles ordered by homepage_rank
 */
export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("candidates") === "1") {
      const q = searchParams.get("q") ?? "";
      const vehicles = await dbSearchHomepageFeaturedCandidates(q);
      const featured = await dbGetHomepageFeaturedVehicles();
      return NextResponse.json({
        vehicles,
        featuredCount: featured.length,
        maxFeatured: HOMEPAGE_SHOWCASE_LIMIT,
      });
    }

    const vehicles = await dbGetHomepageFeaturedVehicles();
    return NextResponse.json({
      vehicles,
      featuredCount: vehicles.length,
      maxFeatured: HOMEPAGE_SHOWCASE_LIMIT,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "加载失败";
    console.error("[GET /api/admin/homepage-featured]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT body:
 * - { orderedIds: string[] } → reorder ranks 1..n (capped at 4)
 * - { id: string, featured: boolean } → add/remove from homepage featured
 */
export async function PUT(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = await request.json();

    if (Array.isArray(body?.orderedIds)) {
      const orderedIds = (body.orderedIds as unknown[])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean);

      const vehicles = await dbReorderHomepageFeatured(orderedIds);
      return NextResponse.json({
        vehicles,
        message: "保存成功",
      });
    }

    if (typeof body?.id === "string" && typeof body?.featured === "boolean") {
      const vehicle = await dbSetHomepageFeatured(body.id.trim(), body.featured);
      const vehicles = await dbGetHomepageFeaturedVehicles();
      return NextResponse.json({
        vehicle,
        vehicles,
        message: "保存成功",
      });
    }

    return NextResponse.json(
      { error: "请求参数无效。请提供 orderedIds 或 id + featured。" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存失败";
    console.error("[PUT /api/admin/homepage-featured]", message);
    const status = message.includes("最多展示") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
