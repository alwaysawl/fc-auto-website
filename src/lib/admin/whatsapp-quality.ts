import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  classifyTrafficSource,
  trafficSourceLabel,
  type TrafficSource,
} from "@/lib/analytics/source";
import {
  deriveWhatsAppQuality,
  emptyWhatsAppQuality,
  parseCustomerType,
  parseLeadStage,
  resolveActualContact,
  whatsappEntryLabel,
  type CustomerType,
  type LeadStage,
  type WhatsAppQualityDashboard,
  type WhatsAppQualityLead,
} from "@/lib/admin/whatsapp-quality-types";

const ASSIGN_PAGE_SIZE = 1000;
const ASSIGN_HARD_CAP = 5000;
const EVENT_PAGE_SIZE = 1000;
const EVENT_HARD_CAP = 20_000;

type AssignmentRow = {
  id: string;
  inquiry_id: string | null;
  created_at: string;
  source_page: string | null;
  page_url: string | null;
  vehicle_title: string | null;
  stock_number: string | null;
  sales_agent_name: string | null;
  customer_type: string | null;
  lead_stage: string | null;
  actual_contact: boolean | null;
};

type ClickRow = {
  event_time: string;
  vehicle_id: string | null;
  referrer_host: string | null;
  metadata: Record<string, unknown> | null;
};

function logSafe(scope: string, err: unknown) {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : err instanceof Error
        ? err.message
        : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  console.error(`[whatsapp-quality.${scope}]`, code || "NO_CODE", message.slice(0, 200));
}

function metaString(
  meta: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const v = meta?.[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

function clickSource(row: ClickRow): TrafficSource {
  const meta = row.metadata ?? {};
  return classifyTrafficSource({
    utmSource: meta.utm_source,
    fbclid: meta.fbclid,
    gclid: meta.gclid,
    referrerHost: row.referrer_host,
    firstTouchSource: meta.first_touch_source,
    firstTouchDirect: meta.first_touch_direct,
    firstTouchReferrerHost: meta.first_touch_referrer_host,
    attributionVersion: meta.attribution_version,
  });
}

async function loadAssignments(range: {
  startIso: string;
  endIso: string;
}): Promise<AssignmentRow[]> {
  const supabase = getSupabaseAdmin();
  const rows: AssignmentRow[] = [];
  let from = 0;
  while (rows.length < ASSIGN_HARD_CAP) {
    const to = Math.min(from + ASSIGN_PAGE_SIZE - 1, ASSIGN_HARD_CAP - 1);
    const { data, error } = await supabase
      .from("sales_assignments")
      .select(
        "id, inquiry_id, created_at, source_page, page_url, vehicle_title, stock_number, sales_agent_name, customer_type, lead_stage, actual_contact"
      )
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    const page = (data ?? []) as AssignmentRow[];
    rows.push(...page);
    if (page.length < ASSIGN_PAGE_SIZE) break;
    from += ASSIGN_PAGE_SIZE;
  }
  return rows;
}

async function loadWhatsAppClicks(range: {
  startIso: string;
  endIso: string;
}): Promise<ClickRow[]> {
  const supabase = getSupabaseAdmin();
  const rows: ClickRow[] = [];
  let from = 0;
  while (rows.length < EVENT_HARD_CAP) {
    const to = Math.min(from + EVENT_PAGE_SIZE - 1, EVENT_HARD_CAP - 1);
    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_time, vehicle_id, referrer_host, metadata")
      .eq("event_name", "whatsapp_click")
      .gte("event_time", range.startIso)
      .lt("event_time", range.endIso)
      .order("event_time", { ascending: true })
      .range(from, to);
    if (error) throw error;
    const page = (data ?? []) as ClickRow[];
    rows.push(...page);
    if (page.length < EVENT_PAGE_SIZE) break;
    from += EVENT_PAGE_SIZE;
  }
  return rows;
}

function clickByInquiryId(clicks: ClickRow[]): Map<string, ClickRow> {
  const map = new Map<string, ClickRow>();
  for (const row of clicks) {
    const inquiryId = metaString(row.metadata, "inquiry_id");
    if (!inquiryId) continue;
    if (!map.has(inquiryId)) map.set(inquiryId, row);
  }
  return map;
}

async function vehicleTitles(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, brand, model, title_en")
      .in("id", unique.slice(0, 80));
    if (error) throw error;
    for (const v of data ?? []) {
      const title =
        (v.title_en as string | null)?.trim() ||
        `${v.brand ?? ""} ${v.model ?? ""}`.trim() ||
        String(v.id);
      out.set(String(v.id), title);
    }
  } catch (err) {
    logSafe("vehicles", err);
  }
  return out;
}

export async function getWhatsAppQualityDashboard(options: {
  range: { startIso: string; endIso: string };
  uniqueVisitors: number;
}): Promise<WhatsAppQualityDashboard> {
  const uniqueVisitors = Math.max(0, options.uniqueVisitors);

  let assignments: AssignmentRow[];
  try {
    assignments = await loadAssignments(options.range);
  } catch (err) {
    logSafe("assignments", err);
    const empty = emptyWhatsAppQuality(uniqueVisitors);
    return {
      ...empty,
      available: false,
      error: "WhatsApp 真实询盘数据加载失败，请稍后重试",
    };
  }

  let clicks: ClickRow[] = [];
  try {
    clicks = await loadWhatsAppClicks(options.range);
  } catch (err) {
    logSafe("clicks", err);
    clicks = [];
  }

  const clickMap = clickByInquiryId(clicks);
  const vehicleIds: string[] = [];
  for (const click of clickMap.values()) {
    const id = click.vehicle_id?.trim();
    if (id) vehicleIds.push(id);
  }
  const titles = await vehicleTitles(vehicleIds);

  const leads: WhatsAppQualityLead[] = assignments.map((row) => {
    const inquiryId = (row.inquiry_id ?? "").trim();
    const click = inquiryId ? clickMap.get(inquiryId) ?? null : null;
    const vehicleId = click?.vehicle_id?.trim() || null;
    const vehicleTitle =
      row.vehicle_title?.trim() ||
      (vehicleId ? titles.get(vehicleId) ?? null : null) ||
      row.stock_number?.trim() ||
      null;
    const source: TrafficSource = click ? clickSource(click) : "unknown";
    const customerType = parseCustomerType(row.customer_type);
    const leadStage = parseLeadStage(row.lead_stage);
    const actualContact = Boolean(row.actual_contact) || resolveActualContact(leadStage, false);

    return {
      id: String(row.id),
      inquiryId,
      createdAt: row.created_at,
      source,
      sourceLabel: click ? trafficSourceLabel(source) : "未知来源",
      entry: whatsappEntryLabel(row.source_page),
      entryRaw: row.source_page,
      vehicleTitle,
      vehicleId,
      assignedContact: row.sales_agent_name?.trim() || null,
      customerType,
      leadStage,
      actualContact,
      linkedToAnalytics: Boolean(click),
    };
  });

  const derived = deriveWhatsAppQuality(leads, uniqueVisitors);
  return {
    available: true,
    error: null,
    funnel: derived.funnel,
    sourceQuality: derived.sourceQuality,
    leads: leads,
  };
}

export async function updateWhatsAppQuality(input: {
  id: string;
  customerType?: CustomerType;
  leadStage?: LeadStage;
}): Promise<{ ok: true; lead: WhatsAppQualityLead } | { ok: false; error: string }> {
  const id = input.id.trim();
  if (!id) return { ok: false, error: "记录无效" };

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: loadError } = await supabase
      .from("sales_assignments")
      .select(
        "id, inquiry_id, created_at, source_page, page_url, vehicle_title, stock_number, sales_agent_name, customer_type, lead_stage, actual_contact"
      )
      .eq("id", id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!existing) return { ok: false, error: "记录不存在" };

    const customerType =
      input.customerType ?? parseCustomerType(existing.customer_type);
    const leadStage = input.leadStage ?? parseLeadStage(existing.lead_stage);
    const actualContact = resolveActualContact(
      leadStage,
      Boolean(existing.actual_contact)
    );

    const { data: updated, error: updateError } = await supabase
      .from("sales_assignments")
      .update({
        customer_type: customerType,
        lead_stage: leadStage,
        actual_contact: actualContact,
      })
      .eq("id", id)
      .select(
        "id, inquiry_id, created_at, source_page, page_url, vehicle_title, stock_number, sales_agent_name, customer_type, lead_stage, actual_contact"
      )
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return { ok: false, error: "保存失败" };

    const row = updated as AssignmentRow;
    const inquiryId = (row.inquiry_id ?? "").trim();
    let linked = false;
    let source: TrafficSource = "unknown";
    let vehicleId: string | null = null;
    if (inquiryId) {
      const { data: click } = await supabase
        .from("analytics_events")
        .select("event_time, vehicle_id, referrer_host, metadata")
        .eq("event_name", "whatsapp_click")
        .contains("metadata", { inquiry_id: inquiryId })
        .order("event_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (click) {
        linked = true;
        source = clickSource(click as ClickRow);
        vehicleId = (click as ClickRow).vehicle_id?.trim() || null;
      }
    }

    const titles = await vehicleTitles(vehicleId ? [vehicleId] : []);
    const leadStageParsed = parseLeadStage(row.lead_stage);
    const lead: WhatsAppQualityLead = {
      id: String(row.id),
      inquiryId,
      createdAt: row.created_at,
      source,
      sourceLabel: linked ? trafficSourceLabel(source) : "未知来源",
      entry: whatsappEntryLabel(row.source_page),
      entryRaw: row.source_page,
      vehicleTitle:
        row.vehicle_title?.trim() ||
        (vehicleId ? titles.get(vehicleId) ?? null : null) ||
        row.stock_number?.trim() ||
        null,
      vehicleId,
      assignedContact: row.sales_agent_name?.trim() || null,
      customerType: parseCustomerType(row.customer_type),
      leadStage: leadStageParsed,
      actualContact:
        Boolean(row.actual_contact) || resolveActualContact(leadStageParsed, false),
      linkedToAnalytics: linked,
    };

    return { ok: true, lead };
  } catch (err) {
    logSafe("update", err);
    return { ok: false, error: "保存失败，请稍后重试" };
  }
}
