import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  isProformaStatus,
  type ProformaStatus,
} from "@/lib/admin/proforma/types";
import {
  markProformaPdfGenerated,
  updateProformaStatus,
} from "@/lib/admin/proforma/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.pdfGenerated === true) {
      const result = await markProformaPdfGenerated(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    const status = body.status;
    if (!isProformaStatus(status)) {
      return NextResponse.json({ error: "状态无效" }, { status: 400 });
    }

    const result = await updateProformaStatus(id, status as ProformaStatus);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[POST /api/admin/proforma-invoices/:id/status]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "状态更新失败，请稍后重试" },
      { status: 500 }
    );
  }
}
