import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  getProformaInvoice,
  markProformaPdfGenerated,
} from "@/lib/admin/proforma/service";
import {
  buildProformaPdfBytes,
  detailToPdfSource,
} from "@/lib/proforma/buildProformaPdf";
import { buildProformaDownloadFilename } from "@/lib/proforma/pdfDownloadName";
import { checkProformaOnePageFit, PI_MAX_VEHICLES } from "@/lib/proforma/layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Server-generated Proforma Invoice PDF.
 *
 * Query:
 * - disposition=inline  → Preview PDF (open in browser)
 * - disposition=attachment (default) → Download PDF
 */
export async function GET(request: Request, ctx: Ctx) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const url = new URL(request.url);
    const dispositionParam = (url.searchParams.get("disposition") || "")
      .trim()
      .toLowerCase();
    const disposition =
      dispositionParam === "inline" ? "inline" : "attachment";

    const result = await getProformaInvoice(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    const invoice = result.invoice;
    if (invoice.items.length > PI_MAX_VEHICLES) {
      return NextResponse.json(
        {
          error: `此发票含 ${invoice.items.length} 台车辆（超过 ${PI_MAX_VEHICLES} 台上限），无法生成 PDF`,
        },
        { status: 400 }
      );
    }

    const fit = checkProformaOnePageFit({
      vehicleCount: invoice.items.length,
      enabledTerms: invoice.termsSnapshot
        .filter((t) => t.enabled)
        .map((t) => ({ textEn: t.textEn, textZh: t.textZh })),
      notes: invoice.notes,
    });
    if (!fit.ok) {
      return NextResponse.json(
        { error: fit.errorZh || fit.errorEn || "无法生成单页 PDF" },
        { status: 400 }
      );
    }

    const { bytes } = await buildProformaPdfBytes(detailToPdfSource(invoice));

    // Best-effort: mark as generated after a successful build.
    const marked = await markProformaPdfGenerated(id);
    if (!marked.ok) {
      console.error("[GET /api/admin/proforma-invoices/:id/pdf] mark generated", {
        message: marked.error,
      });
    }

    const filename = buildProformaDownloadFilename(invoice.invoiceNumber);
    const body = new Uint8Array(bytes.byteLength);
    body.set(bytes);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/proforma-invoices/:id/pdf]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "PDF 生成失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
