import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createProformaInvoice,
  listProformaInvoices,
} from "@/lib/admin/proforma/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const result = await listProformaInvoices({
      q: searchParams.get("q"),
      status: searchParams.get("status"),
      salesperson: searchParams.get("salesperson"),
      destinationCountry: searchParams.get("destinationCountry"),
      destinationPort: searchParams.get("destinationPort"),
      offerFrom: searchParams.get("offerFrom"),
      offerTo: searchParams.get("offerTo"),
      archived: searchParams.get("archived") === "1",
      sort: searchParams.get("sort"),
      page: Number(searchParams.get("page") || 1),
      pageSize: Number(searchParams.get("pageSize") || 20),
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[GET /api/admin/proforma-invoices]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "形式发票列表加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await createProformaInvoice({
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
      message: "形式发票保存成功",
    });
  } catch (err) {
    console.error("[POST /api/admin/proforma-invoices]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "形式发票保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
