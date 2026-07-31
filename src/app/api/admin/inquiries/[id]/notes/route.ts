import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { addInquiryNote } from "@/lib/admin/inquiries/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { note?: string };
    const result = await addInquiryNote(id, body.note ?? "");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: "跟进记录已保存" });
  } catch (err) {
    console.error("[POST /api/admin/inquiries/:id/notes]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "跟进记录保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
