import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assignNextSalesContact } from "@/lib/admin/sales-team/service";
import {
  INQUIRY_STATUS_LABELS,
  type FollowUpFilter,
  type InquiryActivity,
  type InquiryActivityType,
  type InquiryDetail,
  type InquiryDuplicateMatch,
  type InquiryFunnelCounts,
  type InquiryListItem,
  type InquiryListResult,
  type InquirySort,
  type InquiryStatus,
  type InquirySummaryCounts,
  type InquiryPriority,
  type InquirySource,
} from "@/lib/admin/inquiries/types";
import {
  normalizeEmail,
  normalizeNameKey,
  normalizeWhatsApp,
  suggestIntentScore,
} from "@/lib/admin/inquiries/normalize";
import {
  validateInquiryWrite,
  type InquiryWriteInput,
  type ValidatedInquiryWrite,
} from "@/lib/admin/inquiries/validate";
import { isInquiryStatus } from "@/lib/admin/inquiries/types";

const PAGE_SIZE_DEFAULT = 20;

type DbInquiryRow = {
  id: string;
  inquiry_number: string | null;
  customer_name: string | null;
  whatsapp_number: string | null;
  email: string | null;
  customer_country: string | null;
  customer_city: string | null;
  preferred_language: string | null;
  source: string | null;
  vehicle_id: string | null;
  vehicle_title_snapshot: string | null;
  requested_quantity: number | null;
  destination_country_id: string | null;
  destination_port_id: string | null;
  customer_budget_usd: number | string | null;
  customer_message: string | null;
  status: string | null;
  priority: string | null;
  intent_score: number | null;
  assigned_contact_name: string | null;
  assigned_sales_agent_id: string | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  closed_at: string | null;
  lost_reason: string | null;
  internal_summary: string | null;
  tags: string[] | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  whatsapp_normalized: string | null;
  email_normalized: string | null;
};

function logSafe(scope: string, err: unknown) {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : err instanceof Error
        ? err.message
        : String(err);
  console.error(`[inquiries.${scope}]`, message.slice(0, 200));
}

function isMissingTable(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : "";
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  return (
    code === "PGRST205" ||
    msg.toLowerCase().includes("does not exist") ||
    msg.toLowerCase().includes("schema cache")
  );
}

function shanghaiYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shanghaiDayBounds(ymd: string): { start: string; end: string } {
  const start = new Date(`${ymd}T00:00:00+08:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function isOverdue(nextFollowUpAt: string | null, status: string | null): boolean {
  if (!nextFollowUpAt) return false;
  if (status === "won" || status === "lost" || status === "invalid") return false;
  return Date.parse(nextFollowUpAt) < Date.now();
}

function mapListItem(row: DbInquiryRow): InquiryListItem {
  const status = (isInquiryStatus(row.status) ? row.status : "new") as InquiryStatus;
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number || row.id.slice(0, 8),
    customerName: row.customer_name,
    customerCountry: row.customer_country,
    source: (row.source as InquirySource) || "other",
    vehicleId: row.vehicle_id,
    vehicleTitleSnapshot: row.vehicle_title_snapshot,
    requestedQuantity: row.requested_quantity,
    status,
    priority: (row.priority as InquiryPriority) || "medium",
    intentScore: row.intent_score ?? 0,
    assignedContactName: row.assigned_contact_name,
    nextFollowUpAt: row.next_follow_up_at,
    lastContactedAt: row.last_contacted_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
    isOverdue: isOverdue(row.next_follow_up_at, status),
    hasWhatsApp: Boolean(row.whatsapp_number || row.whatsapp_normalized),
    hasEmail: Boolean(row.email || row.email_normalized),
  };
}

async function addActivity(input: {
  inquiryId: string;
  activityType: InquiryActivityType;
  note?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("inquiry_activities").insert({
      inquiry_id: input.inquiryId,
      activity_type: input.activityType,
      note: input.note ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      actor_name: input.actorName ?? "Admin",
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    logSafe("addActivity", err);
  }
}

async function generateInquiryNumber(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("next_inquiry_number");
  if (!error && typeof data === "string" && data.trim()) {
    return data.trim();
  }
  // Fallback if RPC not applied yet
  const ymd = shanghaiYmd().replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `FC-${ymd}-${suffix}`;
}

export async function findInquiryDuplicates(input: {
  whatsappNumber?: string | null;
  email?: string | null;
  customerName?: string | null;
  customerCountry?: string | null;
  vehicleId?: string | null;
  excludeId?: string | null;
}): Promise<InquiryDuplicateMatch[]> {
  try {
    const supabase = getSupabaseAdmin();
    const wa = normalizeWhatsApp(input.whatsappNumber);
    const email = normalizeEmail(input.email);
    const nameKey = normalizeNameKey(input.customerName);
    const country = input.customerCountry?.trim().toLowerCase() || null;

    const { data, error } = await supabase
      .from("inquiries")
      .select(
        "id, inquiry_number, customer_name, status, updated_at, assigned_contact_name, whatsapp_normalized, email_normalized, customer_country, vehicle_id, archived_at"
      )
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(80);

    if (error) throw error;

    const matches: InquiryDuplicateMatch[] = [];
    for (const row of data ?? []) {
      if (input.excludeId && row.id === input.excludeId) continue;
      const reasons: string[] = [];
      if (wa && row.whatsapp_normalized && row.whatsapp_normalized === wa) {
        reasons.push("相同 WhatsApp");
      }
      if (email && row.email_normalized && row.email_normalized === email) {
        reasons.push("相同邮箱");
      }
      const rowName = normalizeNameKey(row.customer_name);
      const rowCountry = (row.customer_country ?? "").trim().toLowerCase();
      if (nameKey && country && rowName === nameKey && rowCountry === country) {
        reasons.push("相同姓名与国家");
      }
      if (
        wa &&
        input.vehicleId &&
        row.whatsapp_normalized === wa &&
        row.vehicle_id === input.vehicleId
      ) {
        reasons.push("相同联系方式与车辆");
      }
      if (reasons.length === 0) continue;
      const status = (isInquiryStatus(row.status) ? row.status : "new") as InquiryStatus;
      matches.push({
        id: row.id,
        inquiryNumber: row.inquiry_number || row.id.slice(0, 8),
        customerName: row.customer_name,
        status,
        statusLabel: INQUIRY_STATUS_LABELS[status],
        updatedAt: row.updated_at,
        assignedContactName: row.assigned_contact_name,
        reason: reasons.join("、"),
      });
      if (matches.length >= 8) break;
    }
    return matches;
  } catch (err) {
    logSafe("findInquiryDuplicates", err);
    return [];
  }
}

export type InquiryListFilters = {
  q?: string | null;
  status?: string | null;
  priority?: string | null;
  assigned?: string | null;
  source?: string | null;
  country?: string | null;
  vehicleId?: string | null;
  tag?: string | null;
  followUp?: FollowUpFilter | string | null;
  archived?: boolean;
  createdFrom?: string | null;
  createdTo?: string | null;
  updatedFrom?: string | null;
  updatedTo?: string | null;
  sort?: InquirySort | string | null;
  page?: number;
  pageSize?: number;
  funnelFrom?: string | null;
  funnelTo?: string | null;
};

function applyAttentionSort(items: InquiryListItem[]): InquiryListItem[] {
  const priorityRank = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    const pr = priorityRank[a.priority] - priorityRank[b.priority];
    if (pr !== 0) return pr;
    if (b.intentScore !== a.intentScore) return b.intentScore - a.intentScore;
    const created = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (created !== 0) return created;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

async function computeSummary(): Promise<InquirySummaryCounts> {
  const empty: InquirySummaryCounts = {
    newCount: 0,
    todayFollowUp: 0,
    overdue: 0,
    interested: 0,
    quoting: 0,
    negotiating: 0,
    won: 0,
    lost: 0,
    unsetFollowUp: 0,
    next7Days: 0,
  };
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("inquiries")
      .select("status, next_follow_up_at, archived_at")
      .is("archived_at", null)
      .limit(5000);
    if (error) throw error;

    const today = shanghaiYmd();
    const { start: todayStart, end: todayEnd } = shanghaiDayBounds(today);
    const weekEnd = new Date(todayStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const now = Date.now();

    for (const row of data ?? []) {
      const status = row.status ?? "new";
      if (status === "new") empty.newCount += 1;
      if (status === "interested") empty.interested += 1;
      if (status === "quoting") empty.quoting += 1;
      if (status === "negotiating") empty.negotiating += 1;
      if (status === "won") empty.won += 1;
      if (status === "lost") empty.lost += 1;

      const closed = status === "won" || status === "lost" || status === "invalid";
      if (!row.next_follow_up_at) {
        if (!closed) empty.unsetFollowUp += 1;
        continue;
      }
      const t = Date.parse(row.next_follow_up_at);
      if (!Number.isFinite(t) || closed) continue;
      if (t < now) empty.overdue += 1;
      if (t >= Date.parse(todayStart) && t < Date.parse(todayEnd)) {
        empty.todayFollowUp += 1;
      }
      if (t >= now && t < weekEnd.getTime()) empty.next7Days += 1;
    }
    return empty;
  } catch (err) {
    logSafe("computeSummary", err);
    return empty;
  }
}

async function computeFunnel(
  fromIso?: string | null,
  toIso?: string | null
): Promise<InquiryFunnelCounts> {
  const empty: InquiryFunnelCounts = {
    newCount: 0,
    contacted: 0,
    interested: 0,
    quoting: 0,
    negotiating: 0,
    won: 0,
    sampleSmall: true,
  };
  try {
    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("inquiries")
      .select("status, created_at")
      .is("archived_at", null)
      .limit(5000);
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lt("created_at", toIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data ?? [];
    for (const row of rows) {
      const s = row.status ?? "new";
      if (s === "new" || s === "pending_contact") empty.newCount += 1;
      if (s === "contacted") empty.contacted += 1;
      if (s === "interested") empty.interested += 1;
      if (s === "quoting" || s === "waiting_customer") empty.quoting += 1;
      if (s === "negotiating") empty.negotiating += 1;
      if (s === "won") empty.won += 1;
    }
    empty.sampleSmall = rows.length < 10;
    return empty;
  } catch (err) {
    logSafe("computeFunnel", err);
    return empty;
  }
}

export async function listInquiries(
  filters: InquiryListFilters = {}
): Promise<InquiryListResult> {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(
    50,
    Math.max(10, Number(filters.pageSize) || PAGE_SIZE_DEFAULT)
  );
  const summary = await computeSummary();
  const funnel = await computeFunnel(filters.funnelFrom, filters.funnelTo);

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("inquiries").select(
      "id, inquiry_number, customer_name, whatsapp_number, email, customer_country, source, vehicle_id, vehicle_title_snapshot, requested_quantity, status, priority, intent_score, assigned_contact_name, next_follow_up_at, last_contacted_at, archived_at, created_at, updated_at, whatsapp_normalized, email_normalized, tags, internal_summary",
      { count: "exact" }
    );

    if (filters.archived) {
      query = query.not("archived_at", "is", null);
    } else {
      query = query.is("archived_at", null);
    }

    if (filters.status && isInquiryStatus(filters.status)) {
      query = query.eq("status", filters.status);
    }
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.assigned) {
      query = query.eq("assigned_contact_name", filters.assigned);
    }
    if (filters.source) query = query.eq("source", filters.source);
    if (filters.country) {
      query = query.ilike("customer_country", `%${filters.country.trim()}%`);
    }
    if (filters.vehicleId) query = query.eq("vehicle_id", filters.vehicleId);
    if (filters.tag) query = query.contains("tags", [filters.tag]);

    if (filters.createdFrom) {
      query = query.gte("created_at", new Date(filters.createdFrom).toISOString());
    }
    if (filters.createdTo) {
      const end = new Date(filters.createdTo);
      end.setUTCDate(end.getUTCDate() + 1);
      query = query.lt("created_at", end.toISOString());
    }
    if (filters.updatedFrom) {
      query = query.gte("updated_at", new Date(filters.updatedFrom).toISOString());
    }
    if (filters.updatedTo) {
      const end = new Date(filters.updatedTo);
      end.setUTCDate(end.getUTCDate() + 1);
      query = query.lt("updated_at", end.toISOString());
    }

    const followUp = filters.followUp;
    const today = shanghaiYmd();
    const { start: todayStart, end: todayEnd } = shanghaiDayBounds(today);
    if (followUp === "today") {
      query = query
        .gte("next_follow_up_at", todayStart)
        .lt("next_follow_up_at", todayEnd);
    } else if (followUp === "overdue") {
      query = query
        .lt("next_follow_up_at", new Date().toISOString())
        .not("status", "in", '("won","lost","invalid")');
    } else if (followUp === "next_7_days") {
      const weekEnd = new Date(todayStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      query = query
        .gte("next_follow_up_at", new Date().toISOString())
        .lt("next_follow_up_at", weekEnd.toISOString());
    } else if (followUp === "unset") {
      query = query.is("next_follow_up_at", null);
    } else if (followUp === "done") {
      query = query.in("status", ["won", "lost", "invalid"]);
    }

    const sort = (filters.sort as InquirySort) || "attention";
    if (sort === "newest") query = query.order("created_at", { ascending: false });
    else if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (sort === "intent") query = query.order("intent_score", { ascending: false });
    else if (sort === "follow_up") {
      query = query.order("next_follow_up_at", { ascending: true, nullsFirst: false });
    } else if (sort === "updated") {
      query = query.order("updated_at", { ascending: false });
    } else {
      query = query.order("updated_at", { ascending: false });
    }

    // Fetch a wider window for attention sort + text search, then page in memory
    const needMemory =
      sort === "attention" || Boolean(filters.q && filters.q.trim());
    if (needMemory) {
      query = query.limit(500);
    } else {
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    let items = ((data ?? []) as DbInquiryRow[]).map(mapListItem);

    const q = filters.q?.trim().toLowerCase();
    if (q) {
      items = items.filter((item) => {
        const hay = [
          item.inquiryNumber,
          item.customerName,
          item.customerCountry,
          item.vehicleTitleSnapshot,
          item.assignedContactName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        // Also search phone/email via raw rows
        const raw = (data as DbInquiryRow[]).find((r) => r.id === item.id);
        const extra = [
          raw?.whatsapp_number,
          raw?.email,
          raw?.internal_summary,
          raw?.customer_message,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q) || extra.includes(q);
      });
    }

    if (sort === "attention") {
      items = applyAttentionSort(items);
    }

    const total = needMemory ? items.length : count ?? items.length;
    if (needMemory) {
      const from = (page - 1) * pageSize;
      items = items.slice(from, from + pageSize);
    }

    return {
      items,
      total,
      page,
      pageSize,
      summary,
      funnel,
      error: null,
    };
  } catch (err) {
    logSafe("listInquiries", err);
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      summary,
      funnel,
      error: isMissingTable(err)
        ? "询盘数据表尚未就绪，请先执行迁移"
        : "询盘加载失败，请稍后重试",
    };
  }
}

export async function getInquiryDetail(
  id: string
): Promise<{ inquiry: InquiryDetail | null; activities: InquiryActivity[]; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { inquiry: null, activities: [], error: "询盘不存在" };

    const row = data as DbInquiryRow;
    const base = mapListItem(row);
    let vehicle: InquiryDetail["vehicle"] = null;
    if (row.vehicle_id) {
      const { data: v } = await supabase
        .from("vehicles")
        .select("id, brand, model, title_en, main_image_url, photos, status, fob_price, currency")
        .eq("id", row.vehicle_id)
        .maybeSingle();
      if (v) {
        const title =
          (v.title_en as string | null)?.trim() ||
          `${v.brand ?? ""} ${v.model ?? ""}`.trim() ||
          row.vehicle_id;
        const cover =
          (v.main_image_url as string | null)?.trim() ||
          (Array.isArray(v.photos) ? (v.photos[0] as string | undefined) : null) ||
          null;
        const price = Number(v.fob_price);
        vehicle = {
          id: String(v.id),
          title,
          coverUrl: cover,
          status: (v.status as string | null) ?? null,
          priceLabel: Number.isFinite(price)
            ? `${v.currency || "USD"} ${price.toLocaleString("en-US")}`
            : null,
          available: (v.status as string) === "在售",
        };
      }
    }

    const suggestedIntentScore = suggestIntentScore({
      whatsappNumber: row.whatsapp_number,
      email: row.email,
      vehicleId: row.vehicle_id,
      destinationCountryId: row.destination_country_id,
      destinationPortId: row.destination_port_id,
      requestedQuantity: row.requested_quantity,
      customerBudgetUsd: Number(row.customer_budget_usd),
      customerMessage: row.customer_message,
      source: row.source,
      lastContactedAt: row.last_contacted_at,
      status: row.status,
    });

    const inquiry: InquiryDetail = {
      ...base,
      whatsappNumber: row.whatsapp_number,
      email: row.email,
      customerCity: row.customer_city,
      preferredLanguage: row.preferred_language,
      destinationCountryId: row.destination_country_id,
      destinationPortId: row.destination_port_id,
      customerBudgetUsd:
        row.customer_budget_usd == null ? null : Number(row.customer_budget_usd),
      customerMessage: row.customer_message,
      assignedSalesAgentId: row.assigned_sales_agent_id,
      closedAt: row.closed_at,
      lostReason: row.lost_reason,
      internalSummary: row.internal_summary,
      tags: row.tags ?? [],
      suggestedIntentScore,
      vehicle,
    };

    const { data: acts } = await supabase
      .from("inquiry_activities")
      .select("*")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    const activities: InquiryActivity[] = (acts ?? []).map((a) => ({
      id: a.id,
      inquiryId: a.inquiry_id,
      activityType: a.activity_type,
      note: a.note,
      oldValue: a.old_value,
      newValue: a.new_value,
      actorName: a.actor_name,
      createdAt: a.created_at,
    }));

    return { inquiry, activities, error: null };
  } catch (err) {
    logSafe("getInquiryDetail", err);
    return {
      inquiry: null,
      activities: [],
      error: isMissingTable(err)
        ? "询盘数据表尚未就绪，请先执行迁移"
        : "询盘加载失败，请稍后重试",
    };
  }
}

function rowFromValidated(data: ValidatedInquiryWrite, extras?: Record<string, unknown>) {
  return {
    customer_name: data.customer_name,
    whatsapp_number: data.whatsapp_number,
    whatsapp_normalized: data.whatsapp_normalized,
    email: data.email,
    email_normalized: data.email_normalized,
    customer_country: data.customer_country,
    customer_city: data.customer_city,
    preferred_language: data.preferred_language,
    source: data.source,
    vehicle_id: data.vehicle_id,
    vehicle_title_snapshot: data.vehicle_title_snapshot,
    requested_quantity: data.requested_quantity,
    destination_country_id: data.destination_country_id,
    destination_port_id: data.destination_port_id,
    customer_budget_usd: data.customer_budget_usd,
    customer_message: data.customer_message,
    status: data.status,
    priority: data.priority,
    intent_score: data.intent_score,
    assigned_contact_name: data.assigned_contact_name,
    assigned_sales_agent_id: data.assigned_sales_agent_id,
    next_follow_up_at: data.next_follow_up_at,
    last_contacted_at: data.last_contacted_at,
    lost_reason: data.lost_reason,
    internal_summary: data.internal_summary,
    tags: data.tags,
    ...extras,
  };
}

export async function createInquiry(
  input: InquiryWriteInput & { autoAssign?: boolean }
): Promise<
  | { ok: true; id: string; inquiryNumber: string; duplicates?: undefined }
  | { ok: false; error: string; duplicates?: InquiryDuplicateMatch[] }
> {
  const validated = validateInquiryWrite(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  let data = validated.data;

  // Suggested score if caller left intent at 0
  if (input.intentScore == null || input.intentScore === 0) {
    data = {
      ...data,
      intent_score: suggestIntentScore({
        whatsappNumber: data.whatsapp_number,
        email: data.email,
        vehicleId: data.vehicle_id,
        destinationCountryId: data.destination_country_id,
        destinationPortId: data.destination_port_id,
        requestedQuantity: data.requested_quantity,
        customerBudgetUsd: data.customer_budget_usd,
        customerMessage: data.customer_message,
        source: data.source,
      }),
    };
  }

  if (!data.forceCreate) {
    const duplicates = await findInquiryDuplicates({
      whatsappNumber: data.whatsapp_number,
      email: data.email,
      customerName: data.customer_name,
      customerCountry: data.customer_country,
      vehicleId: data.vehicle_id,
    });
    if (duplicates.length > 0) {
      return { ok: false, error: "发现可能重复的客户或询盘", duplicates };
    }
  }

  if (!data.assigned_contact_name && input.autoAssign !== false) {
    const next = await assignNextSalesContact();
    if (next) {
      data = {
        ...data,
        assigned_contact_name: next.name,
        assigned_sales_agent_id: next.agentId,
      };
    }
  }

  // Resolve vehicle title snapshot
  if (data.vehicle_id && !data.vehicle_title_snapshot) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: v } = await supabase
        .from("vehicles")
        .select("brand, model, title_en")
        .eq("id", data.vehicle_id)
        .maybeSingle();
      if (v) {
        data = {
          ...data,
          vehicle_title_snapshot:
            (v.title_en as string | null)?.trim() ||
            `${v.brand ?? ""} ${v.model ?? ""}`.trim() ||
            data.vehicle_id,
        };
      }
    } catch {
      // ignore
    }
  }

  const closed =
    data.status === "won" || data.status === "lost" || data.status === "invalid"
      ? new Date().toISOString()
      : null;

  try {
    const supabase = getSupabaseAdmin();
    const inquiryNumber = await generateInquiryNumber();
    const { data: inserted, error } = await supabase
      .from("inquiries")
      .insert({
        ...rowFromValidated(data, {
          inquiry_number: inquiryNumber,
          closed_at: closed,
          metadata: {},
        }),
      })
      .select("id, inquiry_number")
      .single();

    if (error) throw error;

    await addActivity({
      inquiryId: inserted.id,
      activityType: "inquiry_created",
      note: "手动创建询盘",
      newValue: data.status,
    });
    if (data.assigned_contact_name) {
      await addActivity({
        inquiryId: inserted.id,
        activityType: "assigned",
        newValue: data.assigned_contact_name,
        note: "分配负责人",
      });
    }

    return {
      ok: true,
      id: inserted.id,
      inquiryNumber: inserted.inquiry_number || inquiryNumber,
    };
  } catch (err) {
    logSafe("createInquiry", err);
    return {
      ok: false,
      error: isMissingTable(err)
        ? "询盘数据表尚未就绪，请先执行迁移"
        : "询盘保存失败，请稍后重试",
    };
  }
}

export async function updateInquiry(
  id: string,
  input: InquiryWriteInput & {
    archive?: boolean;
    unarchive?: boolean;
    reassignReason?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: loadError } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!existing) return { ok: false, error: "询盘不存在" };

    const existingStatus = (
      isInquiryStatus(existing.status) ? existing.status : "new"
    ) as InquiryStatus;

    if (input.archive) {
      await supabase
        .from("inquiries")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      await addActivity({
        inquiryId: id,
        activityType: "archived",
        note: "询盘已归档",
      });
      return { ok: true };
    }
    if (input.unarchive) {
      await supabase.from("inquiries").update({ archived_at: null }).eq("id", id);
      await addActivity({
        inquiryId: id,
        activityType: "unarchived",
        note: "询盘已取消归档",
      });
      return { ok: true };
    }

    const validated = validateInquiryWrite(
      {
        customerName: input.customerName ?? existing.customer_name,
        whatsappNumber: input.whatsappNumber ?? existing.whatsapp_number,
        email: input.email ?? existing.email,
        customerCountry: input.customerCountry ?? existing.customer_country,
        customerCity: input.customerCity ?? existing.customer_city,
        preferredLanguage: input.preferredLanguage ?? existing.preferred_language,
        source: input.source ?? existing.source,
        vehicleId: input.vehicleId ?? existing.vehicle_id,
        vehicleTitleSnapshot:
          input.vehicleTitleSnapshot ?? existing.vehicle_title_snapshot,
        requestedQuantity:
          input.requestedQuantity ?? existing.requested_quantity,
        destinationCountryId:
          input.destinationCountryId ?? existing.destination_country_id,
        destinationPortId:
          input.destinationPortId ?? existing.destination_port_id,
        customerBudgetUsd:
          input.customerBudgetUsd ?? existing.customer_budget_usd,
        customerMessage: input.customerMessage ?? existing.customer_message,
        status: input.status ?? existing.status,
        priority: input.priority ?? existing.priority,
        intentScore: input.intentScore ?? existing.intent_score,
        assignedContactName:
          input.assignedContactName ?? existing.assigned_contact_name,
        assignedSalesAgentId:
          input.assignedSalesAgentId ?? existing.assigned_sales_agent_id,
        nextFollowUpAt: input.nextFollowUpAt ?? existing.next_follow_up_at,
        lastContactedAt: input.lastContactedAt ?? existing.last_contacted_at,
        lostReason: input.lostReason ?? existing.lost_reason,
        internalSummary: input.internalSummary ?? existing.internal_summary,
        tags: input.tags ?? existing.tags,
      },
      { existingStatus }
    );
    if (!validated.ok) return { ok: false, error: validated.error };

    const data = validated.data;
    let closed_at = existing.closed_at as string | null;
    if (
      data.status === "won" ||
      data.status === "lost" ||
      data.status === "invalid"
    ) {
      closed_at = closed_at || new Date().toISOString();
    } else if (
      existingStatus === "won" ||
      existingStatus === "lost" ||
      existingStatus === "invalid"
    ) {
      closed_at = null;
    }

    if (
      (data.status === "lost" || data.status === "invalid") &&
      !data.lost_reason
    ) {
      return { ok: false, error: "请填写流失或无效原因" };
    }

    const { error } = await supabase
      .from("inquiries")
      .update(rowFromValidated(data, { closed_at }))
      .eq("id", id);
    if (error) throw error;

    if (existing.status !== data.status) {
      const type: InquiryActivityType =
        data.status === "won"
          ? "marked_won"
          : data.status === "lost"
            ? "marked_lost"
            : data.status === "contacted"
              ? "contacted"
              : "status_changed";
      await addActivity({
        inquiryId: id,
        activityType: type,
        oldValue: existing.status,
        newValue: data.status,
        note: data.lost_reason,
      });
    }
    if (existing.priority !== data.priority) {
      await addActivity({
        inquiryId: id,
        activityType: "priority_changed",
        oldValue: existing.priority,
        newValue: data.priority,
      });
    }
    if (existing.assigned_contact_name !== data.assigned_contact_name) {
      await addActivity({
        inquiryId: id,
        activityType: "reassigned",
        oldValue: existing.assigned_contact_name,
        newValue: data.assigned_contact_name,
        note: input.reassignReason?.trim().slice(0, 200) || "负责人已更新",
      });
    }
    if (existing.next_follow_up_at !== data.next_follow_up_at) {
      await addActivity({
        inquiryId: id,
        activityType: "follow_up_scheduled",
        oldValue: existing.next_follow_up_at,
        newValue: data.next_follow_up_at,
      });
    }
    if (existing.intent_score !== data.intent_score) {
      await addActivity({
        inquiryId: id,
        activityType: "intent_changed",
        oldValue: String(existing.intent_score ?? ""),
        newValue: String(data.intent_score),
      });
    }

    return { ok: true };
  } catch (err) {
    logSafe("updateInquiry", err);
    return {
      ok: false,
      error: isMissingTable(err)
        ? "询盘数据表尚未就绪，请先执行迁移"
        : "询盘保存失败，请稍后重试",
    };
  }
}

export async function addInquiryNote(
  id: string,
  note: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const text = note.trim().slice(0, 4000);
  if (!text) return { ok: false, error: "请输入跟进内容" };
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("inquiries")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { ok: false, error: "询盘不存在" };
    await addActivity({
      inquiryId: id,
      activityType: "note_added",
      note: text,
    });
    await supabase
      .from("inquiries")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
    return { ok: true };
  } catch (err) {
    logSafe("addInquiryNote", err);
    return { ok: false, error: "跟进记录保存失败，请稍后重试" };
  }
}

export async function recordInquiryQuotation(
  id: string,
  contactName: string
): Promise<void> {
  await addActivity({
    inquiryId: id,
    activityType: "quotation_downloaded",
    note: "已生成报价 PDF",
    newValue: contactName,
  });
}

export function buildInquiryCsv(
  items: Array<InquiryListItem & { whatsappNumber?: string | null; email?: string | null }>,
  opts: { includeContact?: boolean }
): string {
  const headers = [
    "inquiry_number",
    "customer_name",
    "customer_country",
    "source",
    "vehicle_title",
    "quantity",
    "status",
    "priority",
    "intent_score",
    "assigned_contact",
    "next_follow_up",
    "created_at",
    "updated_at",
  ];
  if (opts.includeContact) {
    headers.push("whatsapp", "email");
  }
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const item of items) {
    const row = [
      item.inquiryNumber,
      item.customerName,
      item.customerCountry,
      item.source,
      item.vehicleTitleSnapshot,
      item.requestedQuantity,
      item.status,
      item.priority,
      item.intentScore,
      item.assignedContactName,
      item.nextFollowUpAt,
      item.createdAt,
      item.updatedAt,
    ];
    if (opts.includeContact) {
      row.push(item.whatsappNumber ?? "", item.email ?? "");
    }
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}
