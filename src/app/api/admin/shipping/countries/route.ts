import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createShippingCountry,
  deleteShippingCountry,
  listShippingCountriesWithPorts,
  updateShippingCountry,
} from "@/lib/shippingDestinations/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const result = await listShippingCountriesWithPorts({ enabledOnly: false });
    return NextResponse.json({
      countries: result.countries,
      source: result.source,
      tablesMissing: result.tablesMissing,
    });
  } catch (err) {
    console.error("[GET /api/admin/shipping/countries]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "加载运费目的地失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      id?: string;
      name_en?: string;
      name_fr?: string | null;
      name_zh?: string | null;
      enabled?: boolean;
      display_order?: number;
    };

    const nameEn = body.name_en?.trim() ?? "";
    const nameZh = body.name_zh?.trim() ?? "";
    if (!nameEn && !nameZh) {
      return NextResponse.json({ error: "国家名称不能为空" }, { status: 400 });
    }

    const country = await createShippingCountry({
      id: body.id?.trim() || "",
      name_en: nameEn || nameZh,
      name_fr: body.name_fr ?? null,
      name_zh: nameZh || null,
      enabled: body.enabled !== false,
      display_order: body.display_order,
    });
    return NextResponse.json({ country }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/shipping/countries]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "添加国家失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      id?: string;
      name_en?: string;
      name_fr?: string | null;
      name_zh?: string | null;
      enabled?: boolean;
      display_order?: number;
    };
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "缺少国家 ID" }, { status: 400 });
    }
    if (body.name_en !== undefined && !body.name_en.trim() && !body.name_zh?.trim()) {
      return NextResponse.json({ error: "国家名称不能为空" }, { status: 400 });
    }

    const country = await updateShippingCountry(body.id.trim(), {
      name_en: body.name_en,
      name_fr: body.name_fr,
      name_zh: body.name_zh,
      enabled: body.enabled,
      display_order: body.display_order,
    });
    return NextResponse.json({ country });
  } catch (err) {
    console.error("[PATCH /api/admin/shipping/countries]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新国家失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "缺少国家 ID" }, { status: 400 });
    }
    await deleteShippingCountry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/shipping/countries]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "删除国家失败" },
      { status: 500 }
    );
  }
}
