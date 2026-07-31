import type { InquirySource } from "@/lib/admin/inquiries/types";

/** Strip spaces/dashes; keep leading + and digits for country code. */
export function normalizeWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  const hasPlus = s.startsWith("+");
  s = s.replace(/[^\d]/g, "");
  if (!s) return null;
  return hasPlus ? `+${s}` : s;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s || !s.includes("@")) return null;
  return s.slice(0, 200);
}

export function normalizeNameKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return s || null;
}

export type IntentSignals = {
  whatsappNumber?: string | null;
  email?: string | null;
  vehicleId?: string | null;
  destinationCountryId?: string | null;
  destinationPortId?: string | null;
  requestedQuantity?: number | null;
  customerBudgetUsd?: number | null;
  customerMessage?: string | null;
  source?: InquirySource | string | null;
  lastContactedAt?: string | null;
  status?: string | null;
};

/**
 * Suggested intent 0–100 for sorting help only.
 * Never silently overwrites a manual score.
 */
export function suggestIntentScore(signals: IntentSignals): number {
  let score = 15;

  if (normalizeWhatsApp(signals.whatsappNumber)) score += 18;
  if (normalizeEmail(signals.email)) score += 6;
  if (signals.vehicleId) score += 14;
  if (signals.destinationCountryId || signals.destinationPortId) score += 10;
  if (
    typeof signals.requestedQuantity === "number" &&
    signals.requestedQuantity > 0
  ) {
    score += 10;
  }
  if (
    typeof signals.customerBudgetUsd === "number" &&
    signals.customerBudgetUsd > 0
  ) {
    score += 10;
  }

  const msg = (signals.customerMessage ?? "").trim();
  if (msg.length >= 40) score += 8;
  else if (msg.length >= 10) score += 4;
  else if (msg.length > 0 && msg.length < 6) score -= 6;

  if (signals.source === "cart" || signals.source === "quote_download") {
    score += 8;
  }
  if (signals.source === "vehicle_detail" || signals.source === "whatsapp") {
    score += 4;
  }

  if (signals.lastContactedAt) {
    const days =
      (Date.now() - Date.parse(signals.lastContactedAt)) / (24 * 60 * 60 * 1000);
    if (Number.isFinite(days) && days <= 3) score += 6;
  }

  if (signals.status === "invalid" || signals.status === "lost") score = Math.min(score, 20);

  if (!normalizeWhatsApp(signals.whatsappNumber) && !normalizeEmail(signals.email)) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
