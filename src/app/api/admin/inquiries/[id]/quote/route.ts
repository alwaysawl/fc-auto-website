import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  getInquiryDetail,
  recordInquiryQuotation,
} from "@/lib/admin/inquiries/service";
import { dbGetVehicleById } from "@/lib/supabase/vehicle-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns vehicle payload + assigned contact for client-side PDF generation.
 * Does not change quotation layout; client calls downloadVehicleQuotePdf with contactName.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const detail = await getInquiryDetail(id);
    if (!detail.inquiry) {
      return NextResponse.json(
        { error: detail.error || "询盘不存在" },
        { status: 404 }
      );
    }
    const inquiry = detail.inquiry;
    if (!inquiry.vehicleId) {
      return NextResponse.json(
        { error: "该询盘未关联车辆，无法创建报价" },
        { status: 400 }
      );
    }

    const vehicle = await dbGetVehicleById(inquiry.vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        { error: "关联车辆不存在或已删除" },
        { status: 404 }
      );
    }

    const contactName = inquiry.assignedContactName || "Shawn";
    await recordInquiryQuotation(id, contactName);

    return NextResponse.json({
      ok: true,
      vehicle,
      contactName,
      locale: inquiry.preferredLanguage === "zh" || inquiry.preferredLanguage === "fr"
        ? inquiry.preferredLanguage
        : "en",
      message: "可生成报价",
    });
  } catch (err) {
    console.error("[POST /api/admin/inquiries/:id/quote]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "创建报价失败，请稍后重试" },
      { status: 500 }
    );
  }
}
