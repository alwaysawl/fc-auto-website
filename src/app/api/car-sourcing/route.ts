import { NextResponse } from "next/server";
import { createInquiry } from "@/lib/admin/inquiries/service";
import {
  buildCarSourcingInquiryNote,
  normalizeCarSourcingInput,
  parseBudgetUsd,
  parseQuantity,
  validateCarSourcingValues,
} from "@/lib/car-sourcing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public custom-car-sourcing intake.
 * Creates a CRM inquiry via service role (does not expose admin APIs).
 * Source stored as `other` + tag `custom_car_sourcing` so we stay within
 * the existing DB source CHECK constraint without running SQL.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const values = normalizeCarSourcingInput(body);
    const validated = validateCarSourcingValues(
      values,
      "Please fill in all required fields."
    );
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const note = buildCarSourcingInquiryNote(validated.values);
    const locale =
      typeof body.locale === "string" ? body.locale.trim().slice(0, 8) : null;

    const result = await createInquiry({
      customerName: validated.values.customerName,
      whatsappNumber: validated.values.whatsapp,
      customerCountry: validated.values.country,
      preferredLanguage: locale,
      source: "other",
      status: "new",
      priority: "medium",
      requestedQuantity: parseQuantity(validated.values.quantity),
      customerBudgetUsd: parseBudgetUsd(validated.values.budget),
      vehicleTitleSnapshot: `${validated.values.brand} ${validated.values.model}`.trim(),
      customerMessage: note,
      internalSummary: "Source: custom_car_sourcing",
      tags: ["custom_car_sourcing"],
      forceCreate: true,
      autoAssign: true,
    });

    if (!result.ok) {
      console.error("[POST /api/car-sourcing] inquiry create failed:", result.error);
      // Soft-fail: WhatsApp path still proceeds on the client
      return NextResponse.json(
        { ok: false, error: result.error, whatsappOnly: true },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      inquiryId: result.id,
      inquiryNumber: result.inquiryNumber,
    });
  } catch (err) {
    console.error(
      "[POST /api/car-sourcing]",
      err instanceof Error ? err.message : "unknown"
    );
    return NextResponse.json(
      { ok: false, error: "Submission failed", whatsappOnly: true },
      { status: 200 }
    );
  }
}
