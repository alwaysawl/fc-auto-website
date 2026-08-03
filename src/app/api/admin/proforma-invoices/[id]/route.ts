import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  archiveProformaInvoice,
  getProformaInvoice,
  updateProformaInvoice,
} from "@/lib/admin/proforma/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const result = await getProformaInvoice(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(
      { invoice: result.invoice, activities: result.activities },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("[GET /api/admin/proforma-invoices/:id]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "发票加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.archive === true || body.archive === false) {
      const archived = await archiveProformaInvoice(id, Boolean(body.archive));
      if (!archived.ok) {
        return NextResponse.json({ error: archived.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    const result = await updateProformaInvoice(id, {
      contractNumber: body.contractNumber as string | null,
      status: body.status as string | null,
      customerName: body.customerName as string | null,
      customerCompany: body.customerCompany as string | null,
      customerCountry: body.customerCountry as string | null,
      customerAddress: body.customerAddress as string | null,
      customerWhatsapp: body.customerWhatsapp as string | null,
      customerEmail: body.customerEmail as string | null,
      offerDate: body.offerDate as string | null,
      validityText: body.validityText as string | null,
      destinationCountry: body.destinationCountry as string | null,
      destinationPort: body.destinationPort as string | null,
      salespersonName: body.salespersonName as string | null,
      salespersonPhone: body.salespersonPhone as string | null,
      salespersonEmail: body.salespersonEmail as string | null,
      overrideContact: Boolean(body.overrideContact),
      companySnapshot: body.companySnapshot as never,
      paymentSnapshot: body.paymentSnapshot as never,
      depositUsd: body.depositUsd as number | null,
      termsSnapshot: body.termsSnapshot as never,
      notes: body.notes as string | null,
      internalNotes: body.internalNotes as string | null,
      items: body.items as never,
      charges: body.charges as never,
      markIssued: Boolean(body.markIssued),
      idempotencyKey: body.idempotencyKey as string | null,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          depositExceedsTotal: result.depositExceedsTotal,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      depositExceedsTotal: result.depositExceedsTotal,
      message: "形式发票已更新",
    });
  } catch (err) {
    console.error("[PATCH /api/admin/proforma-invoices/:id]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "形式发票更新失败，请稍后重试" },
      { status: 500 }
    );
  }
}
