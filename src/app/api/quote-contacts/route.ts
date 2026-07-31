import { NextResponse } from "next/server";
import { getQuoteContactsFromDb } from "@/lib/admin/sales-team/service";
import { QUOTE_CONTACTS } from "@/lib/vehicleQuote/contacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public quote contact display values (also appear on quotation PDFs).
 * Falls back to built-in Shawn/Miles display config when DB has no numbers.
 */
export async function GET() {
  try {
    const fromDb = await getQuoteContactsFromDb();
    if (fromDb.length > 0) {
      return NextResponse.json({ contacts: fromDb });
    }
    return NextResponse.json({
      contacts: QUOTE_CONTACTS.map((c) => ({
        id: c.id,
        name: c.name,
        displayName: `${c.name} | FC Auto Export`,
        whatsappDisplay: c.whatsappDisplay,
        qrPath: c.qrPath,
      })),
    });
  } catch {
    return NextResponse.json({
      contacts: QUOTE_CONTACTS.map((c) => ({
        id: c.id,
        name: c.name,
        displayName: `${c.name} | FC Auto Export`,
        whatsappDisplay: c.whatsappDisplay,
        qrPath: c.qrPath,
      })),
    });
  }
}
