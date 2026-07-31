/**
 * Quotation PDF contact assignment (Shawn ↔ Miles round-robin).
 * Display values prefer /api/quote-contacts (sales_agents) when available.
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

let cachedDbContacts: QuoteContact[] | null = null;
let cacheAt = 0;

async function loadDbContacts(): Promise<QuoteContact[]> {
  if (cachedDbContacts && Date.now() - cacheAt < 60_000) {
    return cachedDbContacts;
  }
  try {
    const res = await fetch("/api/quote-contacts", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      contacts?: Array<{
        id: string;
        name: string;
        whatsappDisplay: string;
        qrPath: string;
      }>;
    };
    const list = (json.contacts ?? [])
      .filter((c) => c.name === "Shawn" || c.name === "Miles")
      .map((c) => ({
        id: c.name.toLowerCase() as QuoteContactId,
        name: c.name,
        whatsappDisplay: c.whatsappDisplay,
        qrPath: c.qrPath || `/contacts/${c.name.toLowerCase()}-whatsapp.png`,
      }));
    cachedDbContacts = list;
    cacheAt = Date.now();
    return list;
  } catch {
    return [];
  }
}

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
export function getQuoteContactByName(
  name: string | null | undefined
): QuoteContact | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return (
    QUOTE_CONTACTS.find((c) => c.name.toLowerCase() === key || c.id === key) ??
    null
  );
}

/** Prefer live sales_agents display values; keep RR index behavior unchanged. */
export async function resolveQuoteContact(
  preferredName?: string | null
): Promise<QuoteContact> {
  const db = await loadDbContacts();
  if (preferredName) {
    const key = preferredName.trim().toLowerCase();
    const fromDb = db.find(
      (c) => c.name.toLowerCase() === key || c.id === key
    );
    if (fromDb) return fromDb;
    const fallback = getQuoteContactByName(preferredName);
    if (fallback) return fallback;
  }
  const next = assignNextQuoteContact();
  const fromDb = db.find((c) => c.name === next.name);
  return fromDb ?? next;
}
