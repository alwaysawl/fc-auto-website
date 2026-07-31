import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createInquiry,
  listInquiries,
} from "@/lib/admin/inquiries/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
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
      sort: searchParams.get("sort"),
      page: Number(searchParams.get("page") || 1),
      pageSize: Number(searchParams.get("pageSize") || 20),
      funnelFrom: searchParams.get("funnelFrom"),
      funnelTo: searchParams.get("funnelTo"),
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[GET /api/admin/inquiries]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "询盘加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await createInquiry({
      customerName: body.customerName as string | null,
      whatsappNumber: body.whatsappNumber as string | null,
      email: body.email as string | null,
      customerCountry: body.customerCountry as string | null,
      customerCity: body.customerCity as string | null,
      preferredLanguage: body.preferredLanguage as string | null,
      source: body.source as string | null,
      vehicleId: body.vehicleId as string | null,
      vehicleTitleSnapshot: body.vehicleTitleSnapshot as string | null,
      requestedQuantity: body.requestedQuantity as number | null,
      destinationCountryId: body.destinationCountryId as string | null,
      destinationPortId: body.destinationPortId as string | null,
      customerBudgetUsd: body.customerBudgetUsd as number | null,
      customerMessage: body.customerMessage as string | null,
      status: body.status as string | null,
      priority: body.priority as string | null,
      intentScore: body.intentScore as number | null,
      assignedContactName: body.assignedContactName as string | null,
      assignedSalesAgentId: body.assignedSalesAgentId as string | null,
      nextFollowUpAt: body.nextFollowUpAt as string | null,
      lostReason: body.lostReason as string | null,
      internalSummary: body.internalSummary as string | null,
      tags: body.tags as string[] | null,
      forceCreate: Boolean(body.forceCreate),
      autoAssign: body.autoAssign !== false && !body.assignedContactName,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          duplicates: result.duplicates ?? [],
        },
        { status: result.duplicates?.length ? 409 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      inquiryNumber: result.inquiryNumber,
      message: "询盘保存成功",
    });
  } catch (err) {
    console.error("[POST /api/admin/inquiries]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "询盘保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
