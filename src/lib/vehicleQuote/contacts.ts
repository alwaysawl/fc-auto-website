/**
 * Quotation PDF contact assignment (Shawn ↔ Miles round-robin).
 * Independent of the website WhatsApp assign API — quotation-only.
 */

export type QuoteContactId = "shawn" | "miles";

export type QuoteContact = {
  id: QuoteContactId;
  name: string;
  whatsappDisplay: string;
  qrPath: string;
};

export const QUOTE_CONTACTS: readonly QuoteContact[] = [
  {
    id: "shawn",
    name: "Shawn",
    whatsappDisplay: "+86 16676364929",
    qrPath: "/contacts/shawn-whatsapp.png",
  },
  {
    id: "miles",
    name: "Miles",
    whatsappDisplay: "+86 13432703060",
    qrPath: "/contacts/miles-whatsapp.png",
  },
] as const;

const STORAGE_KEY = "fc-auto-export-quote-contact-rr-v1";

/**
 * Odd quotation → Shawn (index 0), even → Miles (index 1), then repeat.
 * Counter starts at 0 so the first download is Shawn.
 */
export function assignNextQuoteContact(): QuoteContact {
  let nextIndex = 0;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw != null ? Number.parseInt(raw, 10) : 0;
      nextIndex = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      window.localStorage.setItem(STORAGE_KEY, String(nextIndex + 1));
    } catch {
      // ignore storage errors — still return Shawn as first default
    }
  }
  return QUOTE_CONTACTS[nextIndex % QUOTE_CONTACTS.length]!;
}

/** Resolve Shawn/Miles by display name without advancing the round-robin. */
export function getQuoteContactByName(name: string | null | undefined): QuoteContact | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return (
    QUOTE_CONTACTS.find((c) => c.name.toLowerCase() === key || c.id === key) ??
    null
  );
}
