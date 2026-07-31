import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  getShareholderContactProtected,
  updateShareholderAvailability,
  updateShareholderContact,
} from "@/lib/admin/sales-team/service";
import { isAvailabilityStatus } from "@/lib/admin/sales-team/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get("reveal") !== "1") {
      return NextResponse.json(
        { error: "需要明确请求查看联系方式" },
        { status: 400 }
      );
    }
    const result = await getShareholderContactProtected(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[GET /api/admin/sales-team/:id]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "联系方式加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.availabilityStatus != null) {
      if (!isAvailabilityStatus(body.availabilityStatus)) {
        return NextResponse.json({ error: "状态无效" }, { status: 400 });
      }
      const result = await updateShareholderAvailability(
        id,
        body.availabilityStatus
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        message: "接收询盘状态已更新",
      });
    }

    const result = await updateShareholderContact(id, {
      displayName: body.displayName as string | null | undefined,
      whatsappNumber: body.whatsappNumber as string | null | undefined,
      whatsappLabel: body.whatsappLabel as string | null | undefined,
      qrPath: body.qrPath as string | null | undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: "设置已保存" });
  } catch (err) {
    console.error("[PATCH /api/admin/sales-team/:id]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "设置保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
