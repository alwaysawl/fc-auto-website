import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  dbGetHomepageFeaturedVehicles,
  dbReorderHomepageFeatured,
  dbSetHomepageFeatured,
} from "@/lib/supabase/vehicle-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: featured vehicles ordered by homepage_rank. */
export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const vehicles = await dbGetHomepageFeaturedVehicles();
    return NextResponse.json({ vehicles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "加载失败";
    console.error("[GET /api/admin/homepage-featured]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT body:
 * - { orderedIds: string[] } → reorder ranks 1..n
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
        message: "Homepage rankings have been updated.",
      });
    }

    if (typeof body?.id === "string" && typeof body?.featured === "boolean") {
      const vehicle = await dbSetHomepageFeatured(body.id.trim(), body.featured);
      const vehicles = await dbGetHomepageFeaturedVehicles();
      return NextResponse.json({
        vehicle,
        vehicles,
        message: "Homepage rankings have been updated.",
      });
    }

    return NextResponse.json(
      { error: "请求参数无效。请提供 orderedIds 或 id + featured。" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存失败";
    console.error("[PUT /api/admin/homepage-featured]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
