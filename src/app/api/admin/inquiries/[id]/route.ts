import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  getInquiryDetail,
  updateInquiry,
} from "@/lib/admin/inquiries/service";

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
    const result = await getInquiryDetail(id);
    if (!result.inquiry) {
      return NextResponse.json(
        { error: result.error || "询盘不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[GET /api/admin/inquiries/:id]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "询盘加载失败，请稍后重试" },
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
    const result = await updateInquiry(id, {
      customerName: body.customerName as string | null | undefined,
      whatsappNumber: body.whatsappNumber as string | null | undefined,
      email: body.email as string | null | undefined,
      customerCountry: body.customerCountry as string | null | undefined,
      customerCity: body.customerCity as string | null | undefined,
      preferredLanguage: body.preferredLanguage as string | null | undefined,
      source: body.source as string | null | undefined,
      vehicleId: body.vehicleId as string | null | undefined,
      vehicleTitleSnapshot: body.vehicleTitleSnapshot as string | null | undefined,
      requestedQuantity: body.requestedQuantity as number | null | undefined,
      destinationCountryId: body.destinationCountryId as string | null | undefined,
      destinationPortId: body.destinationPortId as string | null | undefined,
      customerBudgetUsd: body.customerBudgetUsd as number | null | undefined,
      customerMessage: body.customerMessage as string | null | undefined,
      status: body.status as string | null | undefined,
      priority: body.priority as string | null | undefined,
      intentScore: body.intentScore as number | null | undefined,
      assignedContactName: body.assignedContactName as string | null | undefined,
      assignedSalesAgentId: body.assignedSalesAgentId as string | null | undefined,
      nextFollowUpAt: body.nextFollowUpAt as string | null | undefined,
      lastContactedAt: body.lastContactedAt as string | null | undefined,
      lostReason: body.lostReason as string | null | undefined,
      internalSummary: body.internalSummary as string | null | undefined,
      tags: body.tags as string[] | null | undefined,
      archive: Boolean(body.archive),
      unarchive: Boolean(body.unarchive),
      reassignReason: body.reassignReason as string | null | undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const message = body.archive
      ? "询盘已归档"
      : body.assignedContactName
        ? "负责人已更新"
        : "询盘保存成功";

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    console.error("[PATCH /api/admin/inquiries/:id]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "询盘保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
