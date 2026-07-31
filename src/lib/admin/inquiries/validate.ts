import {
  isAssignableContact,
  isInquiryPriority,
  isInquirySource,
  isInquiryStatus,
  type InquiryPriority,
  type InquirySource,
  type InquiryStatus,
} from "@/lib/admin/inquiries/types";
import {
  normalizeEmail,
  normalizeWhatsApp,
} from "@/lib/admin/inquiries/normalize";

export type InquiryWriteInput = {
  customerName?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  customerCountry?: string | null;
  customerCity?: string | null;
  preferredLanguage?: string | null;
  source?: string | null;
  vehicleId?: string | null;
  vehicleTitleSnapshot?: string | null;
  requestedQuantity?: number | null;
  destinationCountryId?: string | null;
  destinationPortId?: string | null;
  customerBudgetUsd?: number | null;
  customerMessage?: string | null;
  status?: string | null;
  priority?: string | null;
  intentScore?: number | null;
  assignedContactName?: string | null;
  assignedSalesAgentId?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  lostReason?: string | null;
  internalSummary?: string | null;
  tags?: string[] | null;
  forceCreate?: boolean;
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v.slice(0, max);
}

function cleanNumber(
  value: unknown,
  opts?: { int?: boolean; min?: number; max?: number }
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (opts?.min != null && n < opts.min) return null;
  if (opts?.max != null && n > opts.max) return null;
  return opts?.int ? Math.floor(n) : n;
}

function cleanIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, 40);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}

export type ValidatedInquiryWrite = {
  customer_name: string | null;
  whatsapp_number: string | null;
  whatsapp_normalized: string | null;
  email: string | null;
  email_normalized: string | null;
  customer_country: string | null;
  customer_city: string | null;
  preferred_language: string | null;
  source: InquirySource;
  vehicle_id: string | null;
  vehicle_title_snapshot: string | null;
  requested_quantity: number | null;
  destination_country_id: string | null;
  destination_port_id: string | null;
  customer_budget_usd: number | null;
  customer_message: string | null;
  status: InquiryStatus;
  priority: InquiryPriority;
  intent_score: number;
  assigned_contact_name: string | null;
  assigned_sales_agent_id: string | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  lost_reason: string | null;
  internal_summary: string | null;
  tags: string[];
  forceCreate: boolean;
};

export function validateInquiryWrite(
  raw: InquiryWriteInput,
  opts?: { partial?: boolean; existingStatus?: InquiryStatus }
): { ok: true; data: ValidatedInquiryWrite } | { ok: false; error: string } {
  const sourceRaw = raw.source ?? (opts?.partial ? undefined : "manual");
  const statusRaw = raw.status ?? (opts?.partial ? undefined : "new");
  const priorityRaw = raw.priority ?? (opts?.partial ? undefined : "medium");

  if (sourceRaw != null && !isInquirySource(sourceRaw)) {
    return { ok: false, error: "来源无效" };
  }
  if (statusRaw != null && !isInquiryStatus(statusRaw)) {
    return { ok: false, error: "状态无效" };
  }
  if (priorityRaw != null && !isInquiryPriority(priorityRaw)) {
    return { ok: false, error: "优先级无效" };
  }

  const intent = cleanNumber(raw.intentScore, { int: true, min: 0, max: 100 });
  if (raw.intentScore != null && intent == null) {
    return { ok: false, error: "意向评分须在 0–100" };
  }

  const qty = cleanNumber(raw.requestedQuantity, { int: true, min: 0, max: 9999 });
  if (raw.requestedQuantity != null && qty == null) {
    return { ok: false, error: "数量无效" };
  }

  const budget = cleanNumber(raw.customerBudgetUsd, { min: 0, max: 50_000_000 });
  if (raw.customerBudgetUsd != null && budget == null) {
    return { ok: false, error: "预算无效" };
  }

  let assigned = cleanText(raw.assignedContactName, 40);
  if (assigned && !isAssignableContact(assigned)) {
    // Allow only Shawn / Miles for consistency
    return { ok: false, error: "负责人须为 Shawn 或 Miles" };
  }

  const status = (statusRaw as InquiryStatus | undefined) ?? opts?.existingStatus ?? "new";
  const lostReason = cleanText(raw.lostReason, 500);
  if ((status === "lost" || status === "invalid") && !lostReason && !opts?.partial) {
    // Strongly encourage — require on create/full status set to lost/invalid
    if (statusRaw === "lost" || statusRaw === "invalid") {
      return { ok: false, error: "请填写流失或无效原因" };
    }
  }

  return {
    ok: true,
    data: {
      customer_name: cleanText(raw.customerName, 120),
      whatsapp_number: cleanText(raw.whatsappNumber, 40),
      whatsapp_normalized: normalizeWhatsApp(
        cleanText(raw.whatsappNumber, 40)
      ),
      email: cleanText(raw.email, 200),
      email_normalized: normalizeEmail(cleanText(raw.email, 200)),
      customer_country: cleanText(raw.customerCountry, 80),
      customer_city: cleanText(raw.customerCity, 80),
      preferred_language: cleanText(raw.preferredLanguage, 16),
      source: (sourceRaw as InquirySource | undefined) ?? "manual",
      vehicle_id: cleanText(raw.vehicleId, 80),
      vehicle_title_snapshot: cleanText(raw.vehicleTitleSnapshot, 200),
      requested_quantity: qty,
      destination_country_id: cleanText(raw.destinationCountryId, 16),
      destination_port_id: cleanText(raw.destinationPortId, 64),
      customer_budget_usd: budget,
      customer_message: cleanText(raw.customerMessage, 4000),
      status,
      priority: (priorityRaw as InquiryPriority | undefined) ?? "medium",
      intent_score: intent ?? 0,
      assigned_contact_name: assigned,
      assigned_sales_agent_id: cleanText(raw.assignedSalesAgentId, 80),
      next_follow_up_at: cleanIsoDate(raw.nextFollowUpAt),
      last_contacted_at: cleanIsoDate(raw.lastContactedAt),
      lost_reason: lostReason,
      internal_summary: cleanText(raw.internalSummary, 2000),
      tags: cleanTags(raw.tags),
      forceCreate: Boolean(raw.forceCreate),
    },
  };
}
