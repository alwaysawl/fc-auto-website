import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createShippingPort,
  deleteShippingPort,
  updateShippingPort,
} from "@/lib/shippingDestinations/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNonNegNumber(value: unknown): number | null {
  if (value === "" || value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      country_id?: string;
      port_id?: string;
      name_en?: string;
      name_fr?: string | null;
      name_zh?: string | null;
      single_vehicle_usd?: number;
      container_40ft_usd?: number;
      enabled?: boolean;
      display_order?: number;
    };

    if (!body.country_id?.trim()) {
      return NextResponse.json({ error: "缺少所属国家" }, { status: 400 });
    }
    const nameEn = body.name_en?.trim() ?? "";
    const nameZh = body.name_zh?.trim() ?? "";
    if (!nameEn && !nameZh) {
      return NextResponse.json({ error: "港口名称不能为空" }, { status: 400 });
    }

    const single = parseNonNegNumber(body.single_vehicle_usd);
    const container = parseNonNegNumber(body.container_40ft_usd);
    if (single == null || container == null) {
      return NextResponse.json(
        { error: "运费必须为 0 或正数" },
        { status: 400 }
      );
    }

    const port = await createShippingPort({
      country_id: body.country_id.trim(),
      port_id: body.port_id?.trim() || "",
      name_en: nameEn || nameZh,
      name_fr: body.name_fr ?? null,
      name_zh: nameZh || null,
      single_vehicle_usd: single,
      container_40ft_usd: container,
      enabled: body.enabled !== false,
      display_order: body.display_order,
    });
    return NextResponse.json({ port }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/shipping/ports]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "添加港口失败" },
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
      port_id?: string;
      name_en?: string;
      name_fr?: string | null;
      name_zh?: string | null;
      single_vehicle_usd?: number;
      container_40ft_usd?: number;
      enabled?: boolean;
      display_order?: number;
    };

    if (!body.id?.trim()) {
      return NextResponse.json({ error: "缺少港口 ID" }, { status: 400 });
    }
    if (
      body.name_en !== undefined &&
      !body.name_en.trim() &&
      !body.name_zh?.trim()
    ) {
      return NextResponse.json({ error: "港口名称不能为空" }, { status: 400 });
    }

    let single: number | undefined;
    let container: number | undefined;
    if (body.single_vehicle_usd !== undefined) {
      const parsed = parseNonNegNumber(body.single_vehicle_usd);
      if (parsed == null) {
        return NextResponse.json({ error: "运费必须为 0 或正数" }, { status: 400 });
      }
      single = parsed;
    }
    if (body.container_40ft_usd !== undefined) {
      const parsed = parseNonNegNumber(body.container_40ft_usd);
      if (parsed == null) {
        return NextResponse.json({ error: "运费必须为 0 或正数" }, { status: 400 });
      }
      container = parsed;
    }

    const port = await updateShippingPort(body.id.trim(), {
      port_id: body.port_id,
      name_en: body.name_en,
      name_fr: body.name_fr,
      name_zh: body.name_zh,
      single_vehicle_usd: single,
      container_40ft_usd: container,
      enabled: body.enabled,
      display_order: body.display_order,
    });
    return NextResponse.json({ port });
  } catch (err) {
    console.error("[PATCH /api/admin/shipping/ports]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新港口失败" },
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
      return NextResponse.json({ error: "缺少港口 ID" }, { status: 400 });
    }
    await deleteShippingPort(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/shipping/ports]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "删除港口失败" },
      { status: 500 }
    );
  }
}
