import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  getProformaSettings,
  updateProformaSettings,
} from "@/lib/admin/proforma/service";
import type {
  PaymentAccountSnapshot,
  TermSnapshot,
} from "@/lib/admin/proforma/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const settings = await getProformaSettings();
    return NextResponse.json(
      { settings },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("[GET /api/admin/proforma-invoices/settings]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "设置加载失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await updateProformaSettings({
      companyName: body.companyName as string | undefined,
      companyAddress: body.companyAddress as string | undefined,
      companyWebsite: body.companyWebsite as string | undefined,
      paymentAccounts: body.paymentAccounts as
        | PaymentAccountSnapshot[]
        | undefined,
      defaultTerms: body.defaultTerms as TermSnapshot[] | undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, settings: result.settings });
  } catch (err) {
    console.error("[PUT /api/admin/proforma-invoices/settings]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "设置保存失败，请稍后重试" },
      { status: 500 }
    );
  }
}
