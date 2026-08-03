import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { duplicateProformaInvoice } from "@/lib/admin/proforma/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const result = await duplicateProformaInvoice(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      message: "已复制为新草稿",
    });
  } catch (err) {
    console.error("[POST /api/admin/proforma-invoices/:id/duplicate]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "复制失败，请稍后重试" },
      { status: 500 }
    );
  }
}
