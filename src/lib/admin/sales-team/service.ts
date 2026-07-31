import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  AVAILABILITY_LABELS,
  SHAREHOLDER_NAMES,
  isAvailabilityStatus,
  isShareholderName,
  type AvailabilityStatus,
  type SalesTeamDashboard,
  type SalesTeamRangePreset,
  type ShareholderCard,
  type ShareholderName,
  type ShareholderWorkload,
  type RecentAssignment,
  type TeamActivity,
  type AssignmentBalance,
} from "@/lib/admin/sales-team/types";
import { resolveStatisticsRange } from "@/lib/admin/statistics";
import { INQUIRY_STATUS_LABELS } from "@/lib/admin/inquiries/types";
import { isInquiryStatus } from "@/lib/admin/inquiries/types";

const CLOSED = new Set(["won", "lost", "invalid"]);

type AgentRow = {
  id: string;
  name: string;
  role: string | null;
  whatsapp_number: string | null;
  display_order: number | null;
  is_active: boolean | null;
  availability_status: string | null;
  display_name: string | null;
  whatsapp_label: string | null;
  qr_path: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function logSafe(scope: string, err: unknown) {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : err instanceof Error
        ? err.message
        : String(err);
  console.error(`[sales-team.${scope}]`, message.slice(0, 200));
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

function emptyWorkload(): ShareholderWorkload {
  return {
    openInquiries: 0,
    todayFollowUp: 0,
    overdue: 0,
    highPriority: 0,
    interested: 0,
    quoting: 0,
    negotiating: 0,
  };
}

function availabilityOf(row: AgentRow): AvailabilityStatus {
  if (isAvailabilityStatus(row.availability_status)) {
    return row.availability_status;
  }
  return row.is_active === false ? "paused" : "active";
}

/** Active for NEW automatic assignment only. */
export function canReceiveNewAssignments(status: AvailabilityStatus): boolean {
  return status === "active";
}

/**
 * Shared Shawn↔Miles picker using sales_router_state.
 * Only agents with availability_status=active receive new auto assignments.
 * Does not reassign existing inquiries.
 */
export async function assignNextSalesContact(): Promise<{
  agentId: string | null;
  name: ShareholderName;
  whatsappNumber: string | null;
  role: string | null;
  displayName: string | null;
} | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: agents, error } = await supabase
      .from("sales_agents")
      .select(
        "id, name, role, whatsapp_number, display_order, is_active, availability_status, display_name"
      )
      .order("display_order", { ascending: true });
    if (error) throw error;

    const list = (agents ?? [])
      .filter((a) => isShareholderName(a.name))
      .filter((a) => a.is_active !== false)
      .filter((a) => canReceiveNewAssignments(availabilityOf(a as AgentRow)));

    if (list.length === 0) {
      return null;
    }

    const { data: stateRows } = await supabase
      .from("sales_router_state")
      .select("id, last_display_order")
      .eq("id", 1)
      .limit(1);
    const last = Number(stateRows?.[0]?.last_display_order ?? 0);
    const next =
      list.find((a) => Number(a.display_order) > last) ?? list[0]!;

    await supabase.from("sales_router_state").upsert({
      id: 1,
      last_display_order: next.display_order,
      updated_at: new Date().toISOString(),
    });

    return {
      agentId: String(next.id),
      name: next.name as ShareholderName,
      whatsappNumber: next.whatsapp_number ?? null,
      role: next.role ?? null,
      displayName: next.display_name ?? null,
    };
  } catch (err) {
    logSafe("assignNextSalesContact", err);
    return null;
  }
}

export async function peekNextRecipient(): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: agents } = await supabase
      .from("sales_agents")
      .select("name, display_order, is_active, availability_status")
      .order("display_order", { ascending: true });
    const list = (agents ?? [])
      .filter((a) => isShareholderName(a.name))
      .filter((a) => a.is_active !== false)
      .filter((a) =>
        canReceiveNewAssignments(availabilityOf(a as AgentRow))
      );
    if (list.length === 0) return null;
    if (list.length === 1) return String(list[0]!.name);

    const { data: stateRows } = await supabase
      .from("sales_router_state")
      .select("last_display_order")
      .eq("id", 1)
      .limit(1);
    const last = Number(stateRows?.[0]?.last_display_order ?? 0);
    const next =
      list.find((a) => Number(a.display_order) > last) ?? list[0]!;
    return String(next.name);
  } catch {
    return null;
  }
}

async function loadShareholders(): Promise<AgentRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales_agents")
    .select(
      "id, name, role, whatsapp_number, display_order, is_active, availability_status, display_name, whatsapp_label, qr_path, updated_at, created_at"
    )
    .order("display_order", { ascending: true });
  if (error) throw error;

  const byName = new Map<string, AgentRow>();
  for (const row of (data ?? []) as AgentRow[]) {
    if (!isShareholderName(row.name)) continue;
    if (!byName.has(row.name)) byName.set(row.name, row);
  }

  // Prefer DB rows; do not invent missing shareholders with fake phones
  const out: AgentRow[] = [];
  for (const name of SHAREHOLDER_NAMES) {
    const row = byName.get(name);
    if (row) out.push(row);
  }
  return out;
}

function computeWorkloadFor(
  rows: Array<{
    status: string | null;
    priority: string | null;
    next_follow_up_at: string | null;
  }>
): ShareholderWorkload {
  const w = emptyWorkload();
  const today = shanghaiYmd();
  const { start: todayStart, end: todayEnd } = shanghaiDayBounds(today);
  const now = Date.now();

  for (const row of rows) {
    const status = row.status ?? "new";
    const closed = CLOSED.has(status);
    if (!closed) w.openInquiries += 1;
    if (status === "interested") w.interested += 1;
    if (status === "quoting" || status === "waiting_customer") w.quoting += 1;
    if (status === "negotiating") w.negotiating += 1;
    if (!closed && row.priority === "high") w.highPriority += 1;

    if (closed || !row.next_follow_up_at) continue;
    const t = Date.parse(row.next_follow_up_at);
    if (!Number.isFinite(t)) continue;
    if (t < now) w.overdue += 1;
    if (t >= Date.parse(todayStart) && t < Date.parse(todayEnd)) {
      w.todayFollowUp += 1;
    }
  }
  return w;
}

export async function getSalesTeamDashboard(options: {
  preset?: string | null;
  start?: string | null;
  end?: string | null;
}): Promise<SalesTeamDashboard> {
  const presetRaw = (options.preset ?? "30d") as SalesTeamRangePreset;
  const preset: SalesTeamRangePreset = [
    "today",
    "7d",
    "30d",
    "month",
    "custom",
  ].includes(presetRaw)
    ? presetRaw
    : "30d";
  const range = resolveStatisticsRange(preset, options.start, options.end);
  const generatedAt = new Date().toISOString();

  try {
    const supabase = getSupabaseAdmin();
    const agents = await loadShareholders();

    if (agents.length === 0) {
      return {
        generatedAt,
        timezone: "Asia/Shanghai",
        range,
        summary: {
          activeReceivers: 0,
          openInquiries: 0,
          todayFollowUp: 0,
          overdue: 0,
          assignedLast30d: 0,
          wonLast30d: 0,
        },
        shareholders: [],
        balance: {
          shawnCount: 0,
          milesCount: 0,
          total: 0,
          shawnPercent: 0,
          milesPercent: 0,
          latestAt: null,
          nextRecipient: null,
          summaryLabel: "当前样本较少",
        },
        periodResults: { won: 0, lost: 0, open: 0 },
        recentAssignments: [],
        recentActivity: [],
        noActiveWarning: "至少需要一位负责人接收新询盘。",
        error: "销售团队数据加载失败，请稍后重试",
      };
    }

    const { data: inquiries, error: inqError } = await supabase
      .from("inquiries")
      .select(
        "id, inquiry_number, customer_name, vehicle_title_snapshot, status, priority, assigned_contact_name, next_follow_up_at, created_at, updated_at, archived_at"
      )
      .is("archived_at", null)
      .limit(5000);
    if (inqError) throw inqError;
    const allInquiries = inquiries ?? [];

    const { data: periodAssignments } = await supabase
      .from("sales_assignments")
      .select("id, sales_agent_name, created_at, inquiry_id, vehicle_title, source_page")
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: false })
      .limit(2000);

    const { data: recentAssignRows } = await supabase
      .from("sales_assignments")
      .select(
        "id, sales_agent_name, created_at, inquiry_id, vehicle_title, source_page"
      )
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: activities } = await supabase
      .from("inquiry_activities")
      .select(
        "id, inquiry_id, activity_type, note, old_value, new_value, actor_name, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(40);

    // Last assignment time per agent (all time)
    const lastAssigned = new Map<string, string>();
    const { data: lastRows } = await supabase
      .from("sales_assignments")
      .select("sales_agent_name, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    for (const row of lastRows ?? []) {
      const n = row.sales_agent_name;
      if (n && !lastAssigned.has(n)) lastAssigned.set(n, row.created_at);
    }
    for (const row of allInquiries) {
      const n = row.assigned_contact_name;
      if (!n) continue;
      const t = row.updated_at || row.created_at;
      const prev = lastAssigned.get(n);
      if (!prev || Date.parse(t) > Date.parse(prev)) lastAssigned.set(n, t);
    }

    const thirty = resolveStatisticsRange("30d");
    let assignedLast30d = 0;
    let wonLast30d = 0;
    {
      const { count } = await supabase
        .from("sales_assignments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirty.startIso)
        .lt("created_at", thirty.endIso);
      assignedLast30d = count ?? 0;
      wonLast30d = allInquiries.filter(
        (i) =>
          i.status === "won" &&
          Date.parse(i.updated_at) >= Date.parse(thirty.startIso) &&
          Date.parse(i.updated_at) < Date.parse(thirty.endIso)
      ).length;
    }

    const shareholders: ShareholderCard[] = agents.map((agent) => {
      const name = agent.name as ShareholderName;
      const status = availabilityOf(agent);
      const mine = allInquiries.filter(
        (i) => i.assigned_contact_name === name
      );
      const workload = computeWorkloadFor(mine);
      const wonPeriod = mine.filter(
        (i) =>
          i.status === "won" &&
          Date.parse(i.updated_at) >= Date.parse(range.startIso) &&
          Date.parse(i.updated_at) < Date.parse(range.endIso)
      ).length;
      const lostPeriod = mine.filter(
        (i) =>
          i.status === "lost" &&
          Date.parse(i.updated_at) >= Date.parse(range.startIso) &&
          Date.parse(i.updated_at) < Date.parse(range.endIso)
      ).length;
      const quotingPeriod = mine.filter(
        (i) =>
          (i.status === "quoting" || i.status === "waiting_customer") &&
          Date.parse(i.updated_at) >= Date.parse(range.startIso) &&
          Date.parse(i.updated_at) < Date.parse(range.endIso)
      ).length;

      return {
        id: agent.id,
        name,
        identityLabel: "股东",
        displayName:
          agent.display_name?.trim() || `${name} | FC Auto Export`,
        role: agent.role,
        availabilityStatus: status,
        availabilityLabel: AVAILABILITY_LABELS[status],
        workload,
        wonPeriod,
        lostPeriod,
        quotingPeriod,
        lastAssignedAt: lastAssigned.get(name) ?? null,
        hasWhatsApp: Boolean(agent.whatsapp_number?.trim()),
        whatsappLabel: agent.whatsapp_label,
        qrPath: agent.qr_path,
      };
    });

    // Fill placeholder cards if a shareholder row is missing (no fake phone)
    for (const name of SHAREHOLDER_NAMES) {
      if (shareholders.some((s) => s.name === name)) continue;
      shareholders.push({
        id: `missing-${name.toLowerCase()}`,
        name,
        identityLabel: "股东",
        displayName: `${name} | FC Auto Export`,
        role: null,
        availabilityStatus: "paused",
        availabilityLabel: AVAILABILITY_LABELS.paused,
        workload: emptyWorkload(),
        wonPeriod: 0,
        lostPeriod: 0,
        quotingPeriod: 0,
        lastAssignedAt: null,
        hasWhatsApp: false,
        whatsappLabel: null,
        qrPath: null,
      });
    }
    shareholders.sort(
      (a, b) =>
        SHAREHOLDER_NAMES.indexOf(a.name) - SHAREHOLDER_NAMES.indexOf(b.name)
    );

    const activeReceivers = shareholders.filter((s) =>
      canReceiveNewAssignments(s.availabilityStatus)
    ).length;

    const summaryWorkload = computeWorkloadFor(allInquiries);

    const shawnCount = (periodAssignments ?? []).filter(
      (a) => a.sales_agent_name === "Shawn"
    ).length;
    const milesCount = (periodAssignments ?? []).filter(
      (a) => a.sales_agent_name === "Miles"
    ).length;
    // Also count CRM inquiry creations assigned in range
    const crmShawn = allInquiries.filter(
      (i) =>
        i.assigned_contact_name === "Shawn" &&
        Date.parse(i.created_at) >= Date.parse(range.startIso) &&
        Date.parse(i.created_at) < Date.parse(range.endIso)
    ).length;
    const crmMiles = allInquiries.filter(
      (i) =>
        i.assigned_contact_name === "Miles" &&
        Date.parse(i.created_at) >= Date.parse(range.startIso) &&
        Date.parse(i.created_at) < Date.parse(range.endIso)
    ).length;

    // Prefer sales_assignments for "分配" balance; if empty use CRM creates
    let balShawn = shawnCount;
    let balMiles = milesCount;
    if (balShawn + balMiles === 0) {
      balShawn = crmShawn;
      balMiles = crmMiles;
    }
    const balTotal = balShawn + balMiles;
    const shawnPercent =
      balTotal > 0 ? Math.round((balShawn / balTotal) * 1000) / 10 : 0;
    const milesPercent =
      balTotal > 0 ? Math.round((balMiles / balTotal) * 1000) / 10 : 0;

    let summaryLabel = "分配基本均衡";
    if (activeReceivers === 0) {
      summaryLabel = "一方暂停接收新询盘";
    } else if (activeReceivers === 1) {
      summaryLabel = "一方暂停接收新询盘";
    } else if (balTotal < 8) {
      summaryLabel = "当前样本较少";
    } else if (Math.abs(shawnPercent - milesPercent) >= 30) {
      summaryLabel = "当前分配存在明显差异";
    }

    const balance: AssignmentBalance = {
      shawnCount: balShawn,
      milesCount: balMiles,
      total: balTotal,
      shawnPercent,
      milesPercent,
      latestAt: periodAssignments?.[0]?.created_at ?? null,
      nextRecipient: await peekNextRecipient(),
      summaryLabel,
    };

    const periodResults = {
      won: allInquiries.filter(
        (i) =>
          i.status === "won" &&
          Date.parse(i.updated_at) >= Date.parse(range.startIso) &&
          Date.parse(i.updated_at) < Date.parse(range.endIso)
      ).length,
      lost: allInquiries.filter(
        (i) =>
          i.status === "lost" &&
          Date.parse(i.updated_at) >= Date.parse(range.startIso) &&
          Date.parse(i.updated_at) < Date.parse(range.endIso)
      ).length,
      open: allInquiries.filter((i) => !CLOSED.has(i.status ?? "new")).length,
    };

    const inquiryByNumber = new Map(
      allInquiries.map((i) => [i.inquiry_number, i])
    );
    const inquiryById = new Map(allInquiries.map((i) => [i.id, i]));

    const recentAssignments: RecentAssignment[] = [];
    for (const row of recentAssignRows ?? []) {
      const linked = row.inquiry_id
        ? inquiryByNumber.get(row.inquiry_id) ?? null
        : null;
      recentAssignments.push({
        id: `sa-${row.id}`,
        at: row.created_at,
        inquiryId: linked?.id ?? null,
        inquiryNumber: row.inquiry_id,
        customerName: linked?.customer_name ?? null,
        vehicleTitle: row.vehicle_title ?? linked?.vehicle_title_snapshot ?? null,
        assignedContact: row.sales_agent_name || "—",
        assignmentType: "自动分配",
        source: row.source_page,
      });
    }

    // Manual / reassignment from activities
    for (const act of activities ?? []) {
      if (act.activity_type !== "assigned" && act.activity_type !== "reassigned") {
        continue;
      }
      const inq = inquiryById.get(act.inquiry_id);
      recentAssignments.push({
        id: `act-${act.id}`,
        at: act.created_at,
        inquiryId: act.inquiry_id,
        inquiryNumber: inq?.inquiry_number ?? null,
        customerName: inq?.customer_name ?? null,
        vehicleTitle: inq?.vehicle_title_snapshot ?? null,
        assignedContact: act.new_value || "—",
        assignmentType:
          act.activity_type === "reassigned" ? "重新转交" : "手动指定",
        source: act.note,
      });
    }
    recentAssignments.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

    const recentActivity: TeamActivity[] = [];
    for (const act of activities ?? []) {
      const inq = inquiryById.get(act.inquiry_id);
      let description = act.note || act.activity_type;
      if (act.activity_type === "assigned") {
        description = `新询盘分配给 ${act.new_value || "负责人"}`;
      } else if (act.activity_type === "reassigned") {
        description = `负责人从 ${act.old_value || "—"} 调整为 ${act.new_value || "—"}`;
      } else if (act.activity_type === "note_added") {
        description = "添加了跟进记录";
      } else if (act.activity_type === "status_changed") {
        const to = isInquiryStatus(act.new_value)
          ? INQUIRY_STATUS_LABELS[act.new_value]
          : act.new_value;
        description = `状态更新为 ${to || "—"}`;
      } else if (act.activity_type === "quotation_downloaded") {
        description = "创建/下载了报价";
      } else if (act.activity_type === "marked_won") {
        description = "标记成交";
      } else if (act.activity_type === "marked_lost") {
        description = "标记流失";
      } else if (act.activity_type === "follow_up_scheduled") {
        description = "设置了下次跟进时间";
      }

      recentActivity.push({
        id: act.id,
        at: act.created_at,
        shareholderName: inq?.assigned_contact_name ?? act.new_value,
        description,
        inquiryNumber: inq?.inquiry_number ?? null,
        inquiryId: act.inquiry_id,
      });
    }

    return {
      generatedAt,
      timezone: "Asia/Shanghai",
      range,
      summary: {
        activeReceivers,
        openInquiries: summaryWorkload.openInquiries,
        todayFollowUp: summaryWorkload.todayFollowUp,
        overdue: summaryWorkload.overdue,
        assignedLast30d,
        wonLast30d,
      },
      shareholders,
      balance,
      periodResults,
      recentAssignments: recentAssignments.slice(0, 25),
      recentActivity: recentActivity.slice(0, 25),
      noActiveWarning:
        activeReceivers === 0
          ? "至少需要一位负责人接收新询盘。"
          : null,
      error: null,
    };
  } catch (err) {
    logSafe("getSalesTeamDashboard", err);
    const range = resolveStatisticsRange(
      ((options.preset ?? "30d") as SalesTeamRangePreset) || "30d",
      options.start,
      options.end
    );
    return {
      generatedAt: new Date().toISOString(),
      timezone: "Asia/Shanghai",
      range,
      summary: {
        activeReceivers: 0,
        openInquiries: 0,
        todayFollowUp: 0,
        overdue: 0,
        assignedLast30d: 0,
        wonLast30d: 0,
      },
      shareholders: [],
      balance: {
        shawnCount: 0,
        milesCount: 0,
        total: 0,
        shawnPercent: 0,
        milesPercent: 0,
        latestAt: null,
        nextRecipient: null,
        summaryLabel: "当前样本较少",
      },
      periodResults: { won: 0, lost: 0, open: 0 },
      recentAssignments: [],
      recentActivity: [],
      noActiveWarning: null,
      error: "销售团队数据加载失败，请稍后重试",
    };
  }
}

export async function updateShareholderAvailability(
  agentId: string,
  status: AvailabilityStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAvailabilityStatus(status)) {
    return { ok: false, error: "状态无效" };
  }
  try {
    const supabase = getSupabaseAdmin();
    const agents = await loadShareholders();
    const target = agents.find((a) => a.id === agentId);
    if (!target || !isShareholderName(target.name)) {
      return { ok: false, error: "负责人不存在" };
    }

    if (!canReceiveNewAssignments(status)) {
      const othersActive = agents.filter(
        (a) =>
          a.id !== agentId &&
          canReceiveNewAssignments(availabilityOf(a))
      );
      if (othersActive.length === 0) {
        return { ok: false, error: "至少需要一位负责人接收新询盘。" };
      }
    }

    const { error } = await supabase
      .from("sales_agents")
      .update({
        availability_status: status,
        // Keep is_active true for paused/existing_only so records remain valid;
        // new assignment filters use availability_status only.
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);
    if (error) throw error;

    // Soft activity log without inquiry — store as note on a metadata-only path:
    // use inquiry_activities only when we have inquiry. Skip if none.
    return { ok: true };
  } catch (err) {
    logSafe("updateShareholderAvailability", err);
    return { ok: false, error: "设置保存失败，请稍后重试" };
  }
}

export async function updateShareholderContact(
  agentId: string,
  input: {
    displayName?: string | null;
    whatsappNumber?: string | null;
    whatsappLabel?: string | null;
    qrPath?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const agents = await loadShareholders();
    const target = agents.find((a) => a.id === agentId);
    if (!target || !isShareholderName(target.name)) {
      return { ok: false, error: "负责人不存在" };
    }

    const displayName = (input.displayName ?? "").trim().slice(0, 80);
    const whatsappNumber = (input.whatsappNumber ?? "").trim().slice(0, 40);
    const whatsappLabel = (input.whatsappLabel ?? "").trim().slice(0, 60);
    const qrPath = (input.qrPath ?? "").trim().slice(0, 200);

    if (whatsappNumber) {
      const digits = whatsappNumber.replace(/[^\d+]/g, "");
      if (digits.replace(/\D/g, "").length < 8) {
        return { ok: false, error: "WhatsApp 号码格式无效" };
      }
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.displayName !== undefined) {
      patch.display_name =
        displayName || `${target.name} | FC Auto Export`;
    }
    if (input.whatsappNumber !== undefined) {
      if (!whatsappNumber) {
        return { ok: false, error: "WhatsApp 号码不能为空" };
      }
      patch.whatsapp_number = whatsappNumber.replace(/\s+/g, "");
    }
    if (input.whatsappLabel !== undefined) {
      patch.whatsapp_label = whatsappLabel || whatsappNumber || null;
    }
    if (input.qrPath !== undefined) {
      patch.qr_path = qrPath || null;
    }

    const { error } = await supabase
      .from("sales_agents")
      .update(patch)
      .eq("id", agentId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    logSafe("updateShareholderContact", err);
    return { ok: false, error: "设置保存失败，请稍后重试" };
  }
}

export async function getShareholderContactProtected(
  agentId: string
): Promise<
  | {
      ok: true;
      name: string;
      displayName: string;
      whatsappNumber: string | null;
      whatsappLabel: string | null;
      qrPath: string | null;
    }
  | { ok: false; error: string }
> {
  try {
    const agents = await loadShareholders();
    const target = agents.find((a) => a.id === agentId);
    if (!target) return { ok: false, error: "负责人不存在" };
    return {
      ok: true,
      name: target.name,
      displayName:
        target.display_name?.trim() || `${target.name} | FC Auto Export`,
      whatsappNumber: target.whatsapp_number,
      whatsappLabel: target.whatsapp_label,
      qrPath: target.qr_path,
    };
  } catch (err) {
    logSafe("getShareholderContactProtected", err);
    return { ok: false, error: "联系方式加载失败，请稍后重试" };
  }
}

/** Public-safe quote contacts (numbers appear on PDFs by design). */
export async function getQuoteContactsFromDb(): Promise<
  Array<{
    id: string;
    name: string;
    displayName: string;
    whatsappDisplay: string;
    qrPath: string;
  }>
> {
  try {
    const agents = await loadShareholders();
    return agents
      .filter((a) => a.whatsapp_number?.trim())
      .map((a) => ({
        id: a.name.toLowerCase(),
        name: a.name,
        displayName:
          a.display_name?.trim() || `${a.name} | FC Auto Export`,
        whatsappDisplay:
          a.whatsapp_label?.trim() ||
          formatWhatsAppDisplay(a.whatsapp_number!) ||
          a.whatsapp_number!,
        qrPath:
          a.qr_path?.trim() ||
          (a.name === "Shawn"
            ? "/contacts/shawn-whatsapp.png"
            : a.name === "Miles"
              ? "/contacts/miles-whatsapp.png"
              : ""),
      }));
  } catch (err) {
    logSafe("getQuoteContactsFromDb", err);
    return [];
  }
}

function formatWhatsAppDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("86") && digits.length >= 11) {
    return `+86 ${digits.slice(2)}`;
  }
  return trimmed;
}
