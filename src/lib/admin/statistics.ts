import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAnalyticsDashboardBlock } from "@/lib/analytics/aggregate";
import { getVehicleHeatDashboard } from "@/lib/analytics/vehicle-heat";
import type { VehicleStatus } from "@/lib/types";
import type {
  ActivityItem,
  AnalyticsDashboard,
  AssignmentAgentStat,
  DataSourceStatus,
  MetricValue,
  RankedItem,
  RankedSection,
  StatisticsPayload,
  StatisticsRangePreset,
  TrendBucket,
  VehicleHeatDashboard,
} from "@/lib/admin/statistics-types";

export type {
  ActivityItem,
  AnalyticsDashboard,
  AssignmentAgentStat,
  DataSourceStatus,
  MetricValue,
  RankedItem,
  RankedSection,
  StatisticsPayload,
  StatisticsRangePreset,
  TrendBucket,
  VehicleHeatDashboard,
} from "@/lib/admin/statistics-types";

/** Admin business timezone (China has no DST — fixed +08:00). */
export const ADMIN_TZ = "Asia/Shanghai";
export const ADMIN_TZ_OFFSET = "+08:00";

type VehicleStatRow = {
  id: string;
  status: string | null;
  featured: boolean | null;
  brand: string | null;
  body_type: string | null;
  year: number | null;
  fuel: string | null;
  transmission: string | null;
  fob_price: number | string | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
};

type AssignmentRow = {
  sales_agent_name: string | null;
  created_at: string;
  vehicle_title: string | null;
  source_page: string | null;
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
  console.error(`[statistics.${scope}]`, code || "NO_CODE", message.slice(0, 200));
}

function shanghaiYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shanghaiHour(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: ADMIN_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(hour);
}

/** Shanghai calendar midnight → UTC Date (China has no DST). */
function shanghaiDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00${ADMIN_TZ_OFFSET}`);
}

function addCalendarDays(ymd: string, days: number): string {
  const d = shanghaiDayStart(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return shanghaiYmd(d);
}

function formatShanghaiDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: ADMIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export function resolveStatisticsRange(
  preset: StatisticsRangePreset,
  customStart?: string | null,
  customEnd?: string | null
): {
  preset: StatisticsRangePreset;
  startIso: string;
  endIso: string;
  startLabel: string;
  endLabel: string;
} {
  const now = new Date();
  const today = shanghaiYmd(now);
  let startYmd = today;
  let endYmd = today;
  let resolvedPreset = preset;

  if (preset === "today") {
    startYmd = today;
    endYmd = today;
  } else if (preset === "7d") {
    startYmd = addCalendarDays(today, -6);
    endYmd = today;
  } else if (preset === "30d") {
    startYmd = addCalendarDays(today, -29);
    endYmd = today;
  } else if (preset === "month") {
    startYmd = `${today.slice(0, 7)}-01`;
    endYmd = today;
  } else {
    const s = (customStart ?? "").trim();
    const e = (customEnd ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}$/.test(e) && s <= e) {
      startYmd = s;
      endYmd = e;
    } else {
      resolvedPreset = "30d";
      startYmd = addCalendarDays(today, -29);
      endYmd = today;
    }
  }

  const start = shanghaiDayStart(startYmd);
  const endExclusive = shanghaiDayStart(addCalendarDays(endYmd, 1));

  return {
    preset: resolvedPreset,
    startIso: start.toISOString(),
    endIso: endExclusive.toISOString(),
    startLabel: startYmd,
    endLabel: endYmd,
  };
}

function inRange(iso: string | null | undefined, startIso: string, endIso: string): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  return t >= start && t < end;
}

function numPrice(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function labelOrEmpty(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : "未填写";
}

function rankCounts(map: Map<string, number>, total: number): RankedItem[] {
  return [...map.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh"));
}

function balanceLabel(counts: number[]): string {
  const total = counts.reduce((s, n) => s + n, 0);
  if (total < 5) return "当前样本较少";
  if (counts.length < 2) return "当前样本较少";
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  if (max - min <= 1) return "分配基本均衡";
  if (min === 0 && max >= 3) return "分配存在明显差异";
  if (max / Math.max(min, 1) >= 1.75) return "分配存在明显差异";
  return "分配基本均衡";
}

function buildTrendBuckets(
  dates: string[],
  range: { preset: StatisticsRangePreset; startIso: string; endIso: string; startLabel: string; endLabel: string }
): TrendBucket[] {
  if (range.preset === "today") {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      key: String(h).padStart(2, "0"),
      label: `${String(h).padStart(2, "0")}:00`,
      count: 0,
    }));
    for (const iso of dates) {
      const h = shanghaiHour(new Date(iso));
      if (h >= 0 && h < 24) buckets[h].count += 1;
    }
    return buckets;
  }

  const dayCount =
    Math.round(
      (Date.parse(range.endIso) - Date.parse(range.startIso)) / (24 * 60 * 60 * 1000)
    ) || 1;

  if (dayCount > 62) {
    const map = new Map<string, number>();
    for (const iso of dates) {
      const ymd = shanghaiYmd(new Date(iso));
      const month = ymd.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + 1);
    }
    let cursor = range.startLabel.slice(0, 7);
    const endMonth = range.endLabel.slice(0, 7);
    const out: TrendBucket[] = [];
    while (cursor <= endMonth) {
      out.push({
        key: cursor,
        label: cursor,
        count: map.get(cursor) ?? 0,
      });
      const [y, m] = cursor.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      cursor = next;
      if (out.length > 36) break;
    }
    return out;
  }

  const map = new Map<string, number>();
  for (const iso of dates) {
    const ymd = shanghaiYmd(new Date(iso));
    map.set(ymd, (map.get(ymd) ?? 0) + 1);
  }
  const out: TrendBucket[] = [];
  let cursor = range.startLabel;
  while (cursor <= range.endLabel) {
    out.push({
      key: cursor,
      label: cursor.slice(5),
      count: map.get(cursor) ?? 0,
    });
    cursor = addCalendarDays(cursor, 1);
    if (out.length > 120) break;
  }
  return out;
}

async function probeTable(
  table: string,
  select: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from(table).select(select).limit(1);
    if (error) {
      logSafe(`probe.${table}`, error);
      return { ok: false, error: "该统计项暂无可用数据来源" };
    }
    return { ok: true, error: null };
  } catch (err) {
    logSafe(`probe.${table}`, err);
    return { ok: false, error: "该统计项暂无可用数据来源" };
  }
}

export async function getAdminStatistics(options: {
  preset?: string | null;
  start?: string | null;
  end?: string | null;
}): Promise<StatisticsPayload> {
  const presetRaw = (options.preset ?? "30d") as StatisticsRangePreset;
  const preset: StatisticsRangePreset = [
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
  const loadedAt = formatShanghaiDateTime(generatedAt);

  const sources: DataSourceStatus[] = [];
  const notEnabled: { name: string; reason: string }[] = [];

  // First-party analytics (isolated — failure must not break other stats)
  let analytics: AnalyticsDashboard;
  try {
    const block = await getAnalyticsDashboardBlock({
      range,
      loadedAtLabel: loadedAt,
    });
    analytics = {
      available: block.available,
      emptyWaiting: block.emptyWaiting,
      error: block.error,
      website: block.website,
      websiteTrend: block.websiteTrend,
      popularPages: block.popularPages,
      popularVehicles: block.popularVehicles,
      whatsapp: block.whatsapp,
      cart: block.cart,
      quotes: block.quotes,
      summaryCards: block.summaryCards,
        funnel: block.funnel,
    };

    const baseDetail = block.emptyWaiting
      ? "统计功能已启用，等待新的访问数据。"
      : block.available
        ? "第一方匿名事件"
        : "事件表不可用";

    sources.push(
      {
        id: "analytics_page_views",
        name: "网站访问事件",
        available: block.available,
        detail: baseDetail,
        lastLoadedAt: block.available ? loadedAt : null,
        latestEventAt: block.source.latestEventAt,
        totalEvents: block.source.totalEvents,
        periodEvents: block.available ? block.website.pageViews : null,
        error: block.error,
      },
      {
        id: "analytics_whatsapp",
        name: "WhatsApp 点击事件",
        available: block.available,
        detail: baseDetail,
        lastLoadedAt: block.available ? loadedAt : null,
        latestEventAt: block.source.latestEventAt,
        totalEvents: block.source.totalEvents,
        periodEvents: block.available ? block.whatsapp.totalClicks : null,
        error: block.error,
      },
      {
        id: "analytics_cart",
        name: "购物车事件",
        available: block.available,
        detail: baseDetail,
        lastLoadedAt: block.available ? loadedAt : null,
        latestEventAt: block.source.latestEventAt,
        totalEvents: block.source.totalEvents,
        periodEvents: block.available ? block.cart.addCount : null,
        error: block.error,
      },
      {
        id: "analytics_quotes",
        name: "报价下载事件",
        available: block.available,
        detail: baseDetail,
        lastLoadedAt: block.available ? loadedAt : null,
        latestEventAt: block.source.latestEventAt,
        totalEvents: block.source.totalEvents,
        periodEvents: block.available ? block.quotes.downloads : null,
        error: block.error,
      }
    );
  } catch (err) {
    logSafe("analytics", err);
    analytics = {
      available: false,
      emptyWaiting: false,
      error: "数据加载失败，请稍后重试",
      website: {
        pageViews: 0,
        uniqueVisitors: 0,
        sessions: 0,
        vehicleDetailViews: 0,
        pagesPerSession: null,
      },
      websiteTrend: [],
      popularPages: [],
      popularVehicles: [],
      whatsapp: {
        totalClicks: 0,
        uniqueVisitors: 0,
        bySource: [],
        byContact: [],
        vehicleDetail: 0,
        cartCheckout: 0,
        floatingButton: 0,
        contactPage: 0,
      },
      cart: {
        addCount: 0,
        addVisitors: 0,
        viewVisitors: 0,
        checkoutVisitors: 0,
        conversionRate: null,
        avgCartItems: null,
        avgCartValue: null,
        funnel: [],
      },
      quotes: {
        downloads: 0,
        uniqueVisitors: 0,
        vehicleCount: 0,
        avgPerVehicle: null,
        topVehicles: [],
        trend: [],
      },
      summaryCards: {
        pageViews: 0,
        uniqueVisitors: 0,
        whatsappClicks: 0,
        cartConversionRate: null,
        quoteDownloads: 0,
        prevPageViews: null,
        prevUniqueVisitors: null,
        prevWhatsappClicks: null,
        prevCartConversionRate: null,
        prevQuoteDownloads: null,
      },
      funnel: {
        homeVisitors: 0,
        vehicleDetailVisitors: 0,
        cartAddVisitors: 0,
        whatsappClickVisitors: 0,
        fromPrev: {
          vehicleDetail: null,
          cartAdd: null,
          whatsappClick: null,
        },
        fromHome: {
          vehicleDetail: null,
          cartAdd: null,
          whatsappClick: null,
        },
      },
    };
    sources.push({
      id: "analytics_events",
      name: "analytics_events（第一方事件）",
      available: false,
      detail: "事件统计暂时不可用",
      lastLoadedAt: null,
      error: "数据加载失败，请稍后重试",
    });
  }

  // Vehicle heat (isolated — failure must not break other stats)
  let vehicleHeat: VehicleHeatDashboard;
  try {
    vehicleHeat = await getVehicleHeatDashboard({ range });
  } catch (err) {
    logSafe("vehicleHeat", err);
    vehicleHeat = {
      available: false,
      empty: false,
      error: "车辆热度数据加载失败，请稍后重试",
      leaders: {
        mostViews: null,
        mostWhatsapp: null,
        mostCart: null,
        mostQuotes: null,
      },
      ranking: [],
      highViewLowInquiry: [],
      lowViewHighInquiry: [],
      sampleNote: null,
    };
  }

  // ── Vehicles ──────────────────────────────────────────────────────────────
  let vehicles: VehicleStatRow[] = [];
  let vehiclesOk = false;
  let vehiclesError: string | null = null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, status, featured, brand, body_type, year, fuel, transmission, fob_price, currency, created_at, updated_at"
      )
      .order("updated_at", { ascending: false });
    if (error) throw error;
    vehicles = (data ?? []) as VehicleStatRow[];
    vehiclesOk = true;
  } catch (err) {
    logSafe("vehicles", err);
    vehiclesError = "数据加载失败，请稍后重试";
  }

  sources.push({
    id: "vehicles",
    name: "vehicles（车辆）",
    available: vehiclesOk,
    detail: vehiclesOk ? `已加载 ${vehicles.length} 条车辆记录` : "车辆表不可用",
    lastLoadedAt: vehiclesOk ? loadedAt : null,
    error: vehiclesError,
  });

  const inventory = {
    available: vehiclesOk,
    total: vehicles.length,
    onSale: 0,
    draft: 0,
    sold: 0,
    delisted: 0,
    featured: 0,
    error: vehiclesError,
  };

  if (vehiclesOk) {
    for (const v of vehicles) {
      const status = (v.status ?? "在售") as VehicleStatus;
      if (status === "在售") inventory.onSale += 1;
      else if (status === "草稿") inventory.draft += 1;
      else if (status === "已售") inventory.sold += 1;
      else if (status === "已下架") inventory.delisted += 1;
      if (v.featured) inventory.featured += 1;
    }
  }

  const statusChart = {
    available: vehiclesOk,
    items: vehiclesOk
      ? (
          [
            ["在售", inventory.onSale],
            ["草稿", inventory.draft],
            ["已售", inventory.sold],
            ["已下架", inventory.delisted],
          ] as const
        ).map(([status, count]) => ({
          status: status as VehicleStatus,
          label: status,
          count,
        }))
      : [],
    error: vehiclesError,
  };

  const newVehicleDates = vehicles
    .filter((v) => inRange(v.created_at, range.startIso, range.endIso))
    .map((v) => v.created_at);

  const completedSalesCount = vehicles.filter(
    (v) =>
      (v.status ?? "") === "已售" &&
      inRange(v.updated_at, range.startIso, range.endIso)
  ).length;

  const period: StatisticsPayload["period"] = {
    newVehicles: vehiclesOk
      ? {
          available: true,
          value: newVehicleDates.length,
          message: null,
        }
      : {
          available: false,
          value: null,
          message: "该统计项暂无可用数据来源",
        },
    inquiries: {
      available: false,
      value: null,
      message: "暂无数据来源",
    },
    quotes: {
      available: false,
      value: null,
      message: "暂无数据来源",
    },
    whatsappAssignments: {
      available: false,
      value: null,
      message: "暂无数据来源",
    },
    pdfDownloads: {
      available: false,
      value: null,
      message: "暂无数据来源",
    },
    completedSales: vehiclesOk
      ? {
          available: true,
          value: completedSalesCount,
          message: null,
        }
      : {
          available: false,
          value: null,
          message: "该统计项暂无可用数据来源",
        },
  };

  const vehicleTrend = {
    available: vehiclesOk,
    buckets: vehiclesOk ? buildTrendBuckets(newVehicleDates, range) : [],
    error: vehiclesError,
  };

  function buildBreakdown(
    pick: (v: VehicleStatRow) => string
  ): RankedSection {
    if (!vehiclesOk) {
      return { available: false, items: [], error: vehiclesError };
    }
    const map = new Map<string, number>();
    for (const v of vehicles) {
      const name = pick(v);
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return {
      available: true,
      items: rankCounts(map, vehicles.length),
      error: null,
    };
  }

  const breakdowns = {
    brand: buildBreakdown((v) => labelOrEmpty(v.brand)),
    bodyType: buildBreakdown((v) => labelOrEmpty(v.body_type)),
    year: buildBreakdown((v) =>
      v.year != null && Number.isFinite(Number(v.year))
        ? String(v.year)
        : "未填写"
    ),
    fuel: buildBreakdown((v) => labelOrEmpty(v.fuel)),
    transmission: buildBreakdown((v) => labelOrEmpty(v.transmission)),
  };

  let inventoryValue = {
    available: vehiclesOk,
    currency: "USD",
    totalListPrice: 0,
    averageListPrice: null as number | null,
    maxListPrice: null as number | null,
    minListPrice: null as number | null,
    vehicleCount: 0,
    error: vehiclesError,
  };

  if (vehiclesOk) {
    const onSalePrices: number[] = [];
    const currencies = new Map<string, number>();
    for (const v of vehicles) {
      if ((v.status ?? "在售") !== "在售") continue;
      const price = numPrice(v.fob_price);
      if (price == null) continue;
      onSalePrices.push(price);
      const cur = (v.currency ?? "USD").trim() || "USD";
      currencies.set(cur, (currencies.get(cur) ?? 0) + 1);
    }
    let topCurrency = "USD";
    let topCount = 0;
    for (const [cur, count] of currencies) {
      if (count > topCount) {
        topCurrency = cur;
        topCount = count;
      }
    }
    const total = onSalePrices.reduce((s, n) => s + n, 0);
    inventoryValue = {
      available: true,
      currency: topCurrency,
      totalListPrice: total,
      averageListPrice:
        onSalePrices.length > 0
          ? Math.round(total / onSalePrices.length)
          : null,
      maxListPrice:
        onSalePrices.length > 0 ? Math.max(...onSalePrices) : null,
      minListPrice:
        onSalePrices.length > 0 ? Math.min(...onSalePrices) : null,
      vehicleCount: onSalePrices.length,
      error: null,
    };
  }

  // ── Sales assignments (WhatsApp round-robin log) ──────────────────────────
  let assignmentRows: AssignmentRow[] = [];
  let assignmentsOk = false;
  let assignmentsError: string | null = null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sales_assignments")
      .select("sales_agent_name, created_at, vehicle_title, source_page")
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso)
      .order("created_at", { ascending: false });
    if (error) throw error;
    assignmentRows = (data ?? []) as AssignmentRow[];
    assignmentsOk = true;
  } catch (err) {
    logSafe("sales_assignments", err);
    assignmentsError = "数据加载失败，请稍后重试";
  }

  sources.push({
    id: "sales_assignments",
    name: "sales_assignments（WhatsApp 分配）",
    available: assignmentsOk,
    detail: assignmentsOk
      ? `所选范围 ${assignmentRows.length} 条分配记录`
      : "分配表不可用",
    lastLoadedAt: assignmentsOk ? loadedAt : null,
    error: assignmentsError,
  });

  if (assignmentsOk) {
    period.whatsappAssignments = {
      available: true,
      value: assignmentRows.length,
      message: null,
    };
  }

  let agentNames: string[] = [];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sales_agents")
      .select("name, is_active, display_order")
      .order("display_order", { ascending: true });
    if (error) throw error;
    agentNames = (data ?? []).map((a) => String(a.name));
    sources.push({
      id: "sales_agents",
      name: "sales_agents（销售联系人）",
      available: true,
      detail: `联系人 ${agentNames.length} 位（不含电话）`,
      lastLoadedAt: loadedAt,
      error: null,
    });
  } catch (err) {
    logSafe("sales_agents", err);
    sources.push({
      id: "sales_agents",
      name: "sales_agents（销售联系人）",
      available: false,
      detail: "联系人表不可用",
      lastLoadedAt: null,
      error: "该统计项暂无可用数据来源",
    });
  }

  const assignmentMap = new Map<string, { count: number; latestAt: string | null }>();
  for (const name of agentNames) {
    assignmentMap.set(name, { count: 0, latestAt: null });
  }
  if (assignmentsOk) {
    for (const row of assignmentRows) {
      const name = row.sales_agent_name?.trim() || "未填写";
      const cur = assignmentMap.get(name) ?? { count: 0, latestAt: null };
      cur.count += 1;
      if (!cur.latestAt || row.created_at > cur.latestAt) {
        cur.latestAt = row.created_at;
      }
      assignmentMap.set(name, cur);
    }
  }

  const assignmentTotal = assignmentsOk ? assignmentRows.length : 0;
  const agents: AssignmentAgentStat[] = [...assignmentMap.entries()]
    .map(([name, v]) => ({
      name,
      count: v.count,
      percent:
        assignmentTotal > 0
          ? Math.round((v.count / assignmentTotal) * 1000) / 10
          : 0,
      latestAt: v.latestAt,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const assignments = {
    available: assignmentsOk,
    total: assignmentTotal,
    agents,
    balanceLabel: assignmentsOk
      ? balanceLabel(agents.map((a) => a.count))
      : "当前样本较少",
    error: assignmentsError,
  };

  // ── Optional probes (never invent data) ───────────────────────────────────
  const inquiriesProbe = await probeTable("inquiries", "id");
  sources.push({
    id: "inquiries",
    name: "inquiries（询盘表）",
    available: inquiriesProbe.ok,
    detail: inquiriesProbe.ok ? "表存在" : "生产库中不存在该表",
    lastLoadedAt: inquiriesProbe.ok ? loadedAt : null,
    error: inquiriesProbe.ok ? null : "暂无数据来源",
  });

  // ── Activity (safe, derived only) ─────────────────────────────────────────
  const activityItems: ActivityItem[] = [];
  if (vehiclesOk) {
    const recentNew = [...vehicles]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 8);
    for (const v of recentNew) {
      activityItems.push({
        type: "车辆新增",
        description: `新增车辆：${labelOrEmpty(v.brand)}（${v.status ?? "在售"}）`,
        at: v.created_at,
      });
    }
  }
  if (assignmentsOk) {
    for (const row of assignmentRows.slice(0, 8)) {
      const title = row.vehicle_title?.trim();
      activityItems.push({
        type: "WhatsApp 分配",
        description: title
          ? `询盘已分配给 ${row.sales_agent_name ?? "联系人"}（${title}）`
          : `询盘已分配给 ${row.sales_agent_name ?? "联系人"}`,
        at: row.created_at,
      });
    }
  }

  // Freight updates (ports) — optional, no prices exposed
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shipping_ports")
      .select("port_id, name_en, name_zh, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);
    if (!error && data) {
      sources.push({
        id: "shipping_ports",
        name: "shipping_ports（运费港口）",
        available: true,
        detail: "可用于运费更新动态",
        lastLoadedAt: loadedAt,
        error: null,
      });
      for (const p of data) {
        const label =
          (p.name_zh as string | null)?.trim() ||
          (p.name_en as string | null)?.trim() ||
          String(p.port_id);
        activityItems.push({
          type: "运费更新",
          description: `港口运费配置已更新：${label}`,
          at: String(p.updated_at),
        });
      }
    } else if (error) {
      sources.push({
        id: "shipping_ports",
        name: "shipping_ports（运费港口）",
        available: false,
        detail: "运费表不可用",
        lastLoadedAt: null,
        error: "该统计项暂无可用数据来源",
      });
    }
  } catch (err) {
    logSafe("shipping_ports", err);
    sources.push({
      id: "shipping_ports",
      name: "shipping_ports（运费港口）",
      available: false,
      detail: "运费表不可用",
      lastLoadedAt: null,
      error: "该统计项暂无可用数据来源",
    });
  }

  activityItems.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const activity = {
    available: activityItems.length > 0,
    items: activityItems.slice(0, 15),
    error: activityItems.length > 0 ? null : "暂无可用动态记录",
  };

  // Wire period PDF downloads from first-party quote_download events
  if (analytics.available) {
    period.pdfDownloads = {
      available: true,
      value: analytics.quotes.downloads,
      message: null,
    };
  }

  // CRM inquiries count for selected range (when table is ready)
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso);
    if (!error) {
      period.inquiries = {
        available: true,
        value: count ?? 0,
        message: null,
      };
    }
  } catch (err) {
    logSafe("inquiries.period", err);
  }

  // Remaining business metrics that still lack dedicated tables
  if (!period.inquiries.available) {
    notEnabled.push({
      name: "询盘数量（独立询盘表）",
      reason: "尚无独立询盘数据表，暂用 WhatsApp 分配与点击统计代替部分意向。",
    });
  }
  if (!period.quotes.available) {
    notEnabled.push({
      name: "报价数量（报价单表）",
      reason: "尚无独立报价单表；报价下载次数已由第一方事件统计。",
    });
  }

  return {
    generatedAt,
    timezone: ADMIN_TZ,
    range,
    inventory,
    period,
    statusChart,
    vehicleTrend,
    breakdowns,
    inventoryValue,
    assignments,
    activity,
    sources,
    notEnabled,
    analytics,
    vehicleHeat,
  };
}
