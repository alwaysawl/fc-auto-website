import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { updateWhatsAppQuality } from "@/lib/admin/whatsapp-quality";
import {
  isCustomerType,
  isLeadStage,
} from "@/lib/admin/whatsapp-quality-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const customerType =
      body.customerType === undefined
        ? undefined
        : isCustomerType(body.customerType)
          ? body.customerType
          : null;
    const leadStage =
      body.leadStage === undefined
        ? undefined
        : isLeadStage(body.leadStage)
          ? body.leadStage
          : null;

    if (customerType === null) {
      return NextResponse.json({ error: "客户类型无效" }, { status: 400 });
    }
    if (leadStage === null) {
      return NextResponse.json({ error: "销售阶段无效" }, { status: 400 });
    }
    if (customerType === undefined && leadStage === undefined) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const result = await updateWhatsAppQuality({
      id,
      customerType,
      leadStage,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, lead: result.lead },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("[PATCH /api/admin/sales-assignments/:id]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
