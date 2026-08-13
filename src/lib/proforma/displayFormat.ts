/**
 * Display-only formatting for Proforma Seller company/address.
 * Does not mutate saved admin/company snapshot data.
 */

const PREFERRED_COMPANY =
  "FC Auto Fengcheng Automobile Trade Co., Ltd.";

const PREFERRED_ADDRESS_LINES = [
  "2nd Floor, Wenhai Automobile City",
] as const;

function normalizeCompanyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/automobile/g, "auto")
    .replace(/[^a-z0-9]+/g, "");
}

function isFcCompanyName(name: string): boolean {
  const key = normalizeCompanyKey(name);
  return (
    key.includes("fcautofengcheng") ||
    key.includes("fengchengautotrade") ||
    key.includes("fengchengautomobiletrade")
  );
}

function isFcAddress(address: string): boolean {
  const key = normalizeCompanyKey(address);
  return (
    key.includes("wenhai") ||
    key.includes("guicheng") ||
    key.includes("nanhai") ||
    (key.includes("foshan") && key.includes("wenhua"))
  );
}

/** Preferred one-line company display for known FC names; otherwise original. */
export function formatSellerCompanyDisplay(companyName: string): string {
  const raw = (companyName || "").trim();
  if (!raw) return "—";
  if (isFcCompanyName(raw)) return PREFERRED_COMPANY;
  return raw;
}

/**
 * Preferred street line for known FC addresses.
 * The full snapshot may include company name + remaining city lines;
 * PDF/preview only show this complete street string (wrapping allowed).
 * Otherwise splits on commas/newlines into compact lines (max 5).
 */
export function formatSellerAddressDisplayLines(
  companyAddress: string
): string[] {
  const raw = (companyAddress || "").trim();
  if (!raw) return ["—"];

  if (isFcAddress(raw) || isFcCompanyName(raw)) {
    return [...PREFERRED_ADDRESS_LINES];
  }

  const parts = raw
    .split(/[\n\r]+|,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return ["—"];

  // Drop leading company-name duplicate if present
  const cleaned =
    parts.length > 1 && isFcCompanyName(parts[0]!) ? parts.slice(1) : parts;

  const lines: string[] = [];
  for (const part of cleaned) {
    if (lines.length >= 5) break;
    lines.push(part);
  }
  return lines.length > 0 ? lines : ["—"];
}

export function formatSellerAddressDisplay(companyAddress: string): string {
  return formatSellerAddressDisplayLines(companyAddress).join("\n");
}
