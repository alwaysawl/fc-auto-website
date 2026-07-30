import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { WhatsAppAssignRequest } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FIELD_LENGTH = 500;
const MAX_URL_LENGTH = 2000;

type AssignRpcRow = {
  inquiry_id: string;
  agent_name: string;
  agent_role: string;
  whatsapp_number: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: `Invalid ${fieldName}: expected a string` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (trimmed.length > maxLength) {
    return {
      ok: false,
      error: `Invalid ${fieldName}: exceeds maximum length of ${maxLength}`,
    };
  }

  return { ok: true, value: trimmed };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Malformed JSON body" },
      { status: 400 }
    );
  }

  if (!isPlainObject(body)) {
    return NextResponse.json(
      { success: false, error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const sourcePageResult = normalizeOptionalString(
    body.sourcePage,
    "sourcePage",
    MAX_FIELD_LENGTH
  );
  if (!sourcePageResult.ok) {
    return NextResponse.json(
      { success: false, error: sourcePageResult.error },
      { status: 400 }
    );
  }

  const pageUrlResult = normalizeOptionalString(
    body.pageUrl,
    "pageUrl",
    MAX_URL_LENGTH
  );
  if (!pageUrlResult.ok) {
    return NextResponse.json(
      { success: false, error: pageUrlResult.error },
      { status: 400 }
    );
  }

  if (pageUrlResult.value && !isHttpUrl(pageUrlResult.value)) {
    return NextResponse.json(
      { success: false, error: "Invalid pageUrl: must be an http or https URL" },
      { status: 400 }
    );
  }

  const vehicleTitleResult = normalizeOptionalString(
    body.vehicleTitle,
    "vehicleTitle",
    MAX_FIELD_LENGTH
  );
  if (!vehicleTitleResult.ok) {
    return NextResponse.json(
      { success: false, error: vehicleTitleResult.error },
      { status: 400 }
    );
  }

  const vehicleYearResult = normalizeOptionalString(
    body.vehicleYear,
    "vehicleYear",
    MAX_FIELD_LENGTH
  );
  if (!vehicleYearResult.ok) {
    return NextResponse.json(
      { success: false, error: vehicleYearResult.error },
      { status: 400 }
    );
  }

  const stockNumberResult = normalizeOptionalString(
    body.stockNumber,
    "stockNumber",
    MAX_FIELD_LENGTH
  );
  if (!stockNumberResult.ok) {
    return NextResponse.json(
      { success: false, error: stockNumberResult.error },
      { status: 400 }
    );
  }

  const payload: WhatsAppAssignRequest = {
    sourcePage: sourcePageResult.value ?? undefined,
    pageUrl: pageUrlResult.value ?? undefined,
    vehicleTitle: vehicleTitleResult.value ?? undefined,
    vehicleYear: vehicleYearResult.value ?? undefined,
    stockNumber: stockNumberResult.value ?? undefined,
  };

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    console.error(
      "[whatsapp/assign] configuration error:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await supabase.rpc("assign_next_sales_agent", {
      p_source_page: payload.sourcePage ?? null,
      p_page_url: payload.pageUrl ?? null,
      p_vehicle_title: payload.vehicleTitle ?? null,
      p_vehicle_year: payload.vehicleYear ?? null,
      p_stock_number: payload.stockNumber ?? null,
    });

    if (error) {
      console.error("[whatsapp/assign] rpc failed:", error.message);
      return NextResponse.json(
        { success: false, error: "Assignment unavailable" },
        { status: 503 }
      );
    }

    const row = (Array.isArray(data) ? data[0] : data) as AssignRpcRow | null;

    if (
      !row ||
      typeof row.inquiry_id !== "string" ||
      typeof row.agent_name !== "string" ||
      typeof row.agent_role !== "string" ||
      typeof row.whatsapp_number !== "string" ||
      !row.inquiry_id.trim() ||
      !row.agent_name.trim() ||
      !row.whatsapp_number.trim()
    ) {
      console.error("[whatsapp/assign] rpc returned incomplete assignment");
      return NextResponse.json(
        { success: false, error: "Assignment unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        assignment: {
          inquiryId: row.inquiry_id.trim(),
          agentName: row.agent_name.trim(),
          agentRole: row.agent_role.trim(),
          whatsappNumber: row.whatsapp_number.trim(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[whatsapp/assign] unexpected error:",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { success: false, error: "Assignment unavailable" },
      { status: 503 }
    );
  }
}
