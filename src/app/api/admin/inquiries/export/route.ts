import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  buildInquiryCsv,
  getInquiryDetail,
  listInquiries,
} from "@/lib/admin/inquiries/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const includeContact = searchParams.get("includeContact") === "1";
    const result = await listInquiries({
      q: searchParams.get("q"),
      status: searchParams.get("status"),
      priority: searchParams.get("priority"),
      assigned: searchParams.get("assigned"),
      source: searchParams.get("source"),
      country: searchParams.get("country"),
      vehicleId: searchParams.get("vehicleId"),
      tag: searchParams.get("tag"),
      followUp: searchParams.get("followUp"),
      archived: searchParams.get("archived") === "1",
      createdFrom: searchParams.get("createdFrom"),
      createdTo: searchParams.get("createdTo"),
      updatedFrom: searchParams.get("updatedFrom"),
      updatedTo: searchParams.get("updatedTo"),
      sort: searchParams.get("sort") || "newest",
      page: 1,
      pageSize: 500,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    let rows = result.items.map((item) => ({
      ...item,
      whatsappNumber: null as string | null,
      email: null as string | null,
    }));

    if (includeContact) {
      rows = await Promise.all(
        result.items.map(async (item) => {
          const detail = await getInquiryDetail(item.id);
          return {
            ...item,
            whatsappNumber: detail.inquiry?.whatsappNumber ?? null,
            email: detail.inquiry?.email ?? null,
          };
        })
      );
    }

    const csv = buildInquiryCsv(rows, { includeContact });
    const filename = `inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/inquiries/export]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "导出失败，请稍后重试" },
      { status: 500 }
    );
  }
}
