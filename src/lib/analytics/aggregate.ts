import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { StatisticsRangePreset } from "@/lib/admin/statistics-types";
import {
  classifyTrafficSource,
  parseTrafficSourceFilter,
  trafficSourceLabel,
  TRAFFIC_SOURCE_IDS,
  type TrafficSource,
  type TrafficSourceFilter,
} from "@/lib/analytics/source";

export type AnalyticsDashboardBlock = {
  available: boolean;
  emptyWaiting: boolean;
  error: string | null;
  source: {
    id: string;
    name: string;
    available: boolean;
    detail: string;
    lastLoadedAt: string | null;
    latestEventAt: string | null;
    totalEvents: number | null;
    periodEvents: number | null;
    error: string | null;
  };
  website: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    vehicleDetailViews: number;
    pagesPerSession: number | null;
  };
  websiteTrend: { key: string; label: string; pageViews: number; visitors: number; sessions: number }[];
  popularPages: { path: string; views: number; percent: number; visitors: number }[];
  popularVehicles: {
    vehicleId: string;
    title: string;
    coverUrl: string | null;
    detailViews: number;
    whatsappClicks: number;
    quoteDownloads: number;
  }[];
  trafficSources: {
    source: TrafficSource;
    label: string;
    events: number;
    visitors: number;
    percent: number;
  }[];
  devices: {
    device: "mobile" | "desktop" | "tablet" | "other";
    label: string;
    events: number;
    visitors: number;
    percent: number;
  }[];
  geo: {
    available: boolean;
    message: string;
  };
  whatsapp: {
    totalClicks: number;
    uniqueVisitors: number;
    bySource: { source: string; count: number; percent: number }[];
    byContact: { name: string; count: number; percent: number }[];
    vehicleDetail: number;
    cartCheckout: number;
    floatingButton: number;
    contactPage: number;
  };
  cart: {
    addCount: number;
    addVisitors: number;
    viewVisitors: number;
    checkoutVisitors: number;
    conversionRate: number | null;
    avgCartItems: number | null;
    avgCartValue: number | null;
    funnel: { stage: string; visitors: number }[];
  };
  quotes: {
    downloads: number;
    uniqueVisitors: number;
    vehicleCount: number;
    avgPerVehicle: number | null;
    topVehicles: { vehicleId: string; title: string; downloads: number }[];
    trend: { key: string; label: string; count: number }[];
  };
  summaryCards: {
    pageViews: number;
    uniqueVisitors: number;
    whatsappClicks: number;
    cartConversionRate: number | null;
    quoteDownloads: number;
    prevPageViews: number | null;
    prevUniqueVisitors: number | null;
    prevWhatsappClicks: number | null;
    prevCartConversionRate: number | null;
    prevQuoteDownloads: number | null;
  };
  funnel: {
    filters: {
      source: TrafficSourceFilter;
      device: "all" | "mobile" | "desktop" | "tablet" | "other";
    };
    homeVisitors: number;
    vehicleDetailVisitors: number;
    cartAddVisitors: number;
    whatsappClickVisitors: number;
    fromPrev: {
      vehicleDetail: number | null;
      cartAdd: number | null;
      whatsappClick: number | null;
    };
    fromHome: {
      vehicleDetail: number | null;
      cartAdd: number | null;
      whatsappClick: number | null;
    };
  };
};

type EventRow = {
  event_name: string;
  event_time: string;
  session_id: string | null;
  anonymous_visitor_id: string | null;
  page_path: string | null;
  referrer_host: string | null;
  vehicle_id: string | null;
  cart_item_count: number | null;
  cart_value_usd: number | string | null;
  metadata: Record<string, unknown> | null;
  user_agent_category: string | null;
};

type FunnelSourceFilter = TrafficSourceFilter;
type FunnelDeviceFilter = "all" | "mobile" | "desktop" | "tablet" | "other";

const EVENT_PAGE_SIZE = 1000;
const EVENT_HARD_CAP = 50_000;

const GEO_UNAVAILABLE_MESSAGE =
  "暂无访客国家/地区数据。当前未采集 IP 地理信息；country_id 仅为购物车或询盘填写的目的国，不能代表访客来源地。";

function emptyTrafficSources(): AnalyticsDashboardBlock["trafficSources"] {
  return TRAFFIC_SOURCE_IDS.map((source) => ({
    source,
    label: trafficSourceLabel(source),
    events: 0,
    visitors: 0,
    percent: 0,
  }));
}

function emptyDevices(): AnalyticsDashboardBlock["devices"] {
  return [
    { device: "mobile", label: "移动端", events: 0, visitors: 0, percent: 0 },
    { device: "desktop", label: "电脑端", events: 0, visitors: 0, percent: 0 },
    { device: "tablet", label: "平板", events: 0, visitors: 0, percent: 0 },
    { device: "other", label: "其他", events: 0, visitors: 0, percent: 0 },
  ];
}

function shanghaiYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shanghaiHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      hour12: false,
    }).format(date)
  );
}

/**
 * Strip the locale prefix (/en, /fr, /zh …) and any query string, then
 * collapse vehicle detail paths to a single key so all language variants
 * and all vehicle IDs are merged before aggregation.
 *
 * Returns a canonical key such as:
 *   /           – home
 *   /inventory  – inventory list
 *   /inventory/[id] – any vehicle detail
 *   /cart
 *   /about
 *   /contact
 *   /car-sourcing
 *   /shipping-calculator
 *   (unknown paths are returned without locale prefix but otherwise as-is)
 */
function normalizePagePath(path: string | null): string {
  if (!path) return "/";
  // Strip query string
  const clean = path.split("?")[0] ?? path;
  // Split into non-empty segments
  const parts = clean.split("/").filter(Boolean);
  // Drop leading locale segment (2-letter code)
  const rest = parts[0]?.length === 2 ? parts.slice(1) : parts;

  if (rest.length === 0) return "/";
  // Vehicle detail: /[locale]/inventory/[vehicleId]
  if (rest[0] === "inventory" && rest.length >= 2) return "/inventory/[id]";
  // Other known segments
  return "/" + rest.join("/");
}

/**
 * Map a canonical key (output of normalizePagePath) to a human-readable
 * Chinese label for display in the dashboard.
 */
function friendlyPageLabel(canonicalKey: string): string {
  if (canonicalKey === "/") return "首页";
  if (canonicalKey === "/inventory") return "库存列表";
  if (canonicalKey === "/inventory/[id]") return "车辆详情";
  if (canonicalKey === "/cart") return "购物车";
  if (canonicalKey === "/about") return "关于我们";
  if (canonicalKey === "/contact") return "联系我们";
  if (canonicalKey === "/car-sourcing") return "车辆采购";
  if (canonicalKey === "/shipping-calculator") return "运费估算";
  // Fallback: display the canonical key directly
  return canonicalKey;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function distinct(values: Array<string | null | undefined>): number {
  const set = new Set<string>();
  for (const v of values) {
    if (v && v.trim()) set.add(v.trim());
  }
  return set.size;
}

function previousRange(startIso: string, endIso: string): { startIso: string; endIso: string } {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  const span = Math.max(end - start, 24 * 60 * 60 * 1000);
  return {
    startIso: new Date(start - span).toISOString(),
    endIso: startIso,
  };
}

function buildTrend(
  rows: EventRow[],
  range: { preset: StatisticsRangePreset; startIso: string; endIso: string; startLabel: string; endLabel: string }
) {
  const pageViews = rows.filter((r) => r.event_name === "page_view");
  if (range.preset === "today" || range.preset === "yesterday") {
    return Array.from({ length: 24 }, (_, h) => {
      const key = String(h).padStart(2, "0");
      const hourRows = pageViews.filter(
        (r) => shanghaiHour(new Date(r.event_time)) === h
      );
      return {
        key,
        label: `${key}:00`,
        pageViews: hourRows.length,
        visitors: distinct(hourRows.map((r) => r.anonymous_visitor_id)),
        sessions: distinct(hourRows.map((r) => r.session_id)),
      };
    });
  }

  const daySpan =
    Math.round(
      (Date.parse(range.endIso) - Date.parse(range.startIso)) /
        (24 * 60 * 60 * 1000)
    ) || 1;

  const useMonth = daySpan > 62;
  const map = new Map<
    string,
    { views: EventRow[]; visitors: Set<string>; sessions: Set<string> }
  >();

  for (const r of pageViews) {
    const ymd = shanghaiYmd(new Date(r.event_time));
    const key = useMonth ? ymd.slice(0, 7) : ymd;
    const bucket = map.get(key) ?? {
      views: [],
      visitors: new Set(),
      sessions: new Set(),
    };
    bucket.views.push(r);
    if (r.anonymous_visitor_id) bucket.visitors.add(r.anonymous_visitor_id);
    if (r.session_id) bucket.sessions.add(r.session_id);
    map.set(key, bucket);
  }

  const out: {
    key: string;
    label: string;
    pageViews: number;
    visitors: number;
    sessions: number;
  }[] = [];

  if (useMonth) {
    for (const [key, b] of [...map.entries()].sort()) {
      out.push({
        key,
        label: key,
        pageViews: b.views.length,
        visitors: b.visitors.size,
        sessions: b.sessions.size,
      });
    }
    return out;
  }

  // fill days
  let cursor = range.startLabel;
  const end = range.endLabel;
  while (cursor <= end && out.length < 120) {
    const b = map.get(cursor);
    out.push({
      key: cursor,
      label: cursor.slice(5),
      pageViews: b?.views.length ?? 0,
      visitors: b?.visitors.size ?? 0,
      sessions: b?.sessions.size ?? 0,
    });
    const d = new Date(`${cursor}T00:00:00+08:00`);
    d.setUTCDate(d.getUTCDate() + 1);
    cursor = shanghaiYmd(d);
  }
  return out;
}

async function loadEvents(
  startIso: string,
  endIso: string
): Promise<{ ok: boolean; rows: EventRow[]; error: string | null; tableMissing: boolean }> {
  try {
    const supabase = getSupabaseAdmin();
    const rows: EventRow[] = [];
    let from = 0;

    while (from < EVENT_HARD_CAP) {
      const to = from + EVENT_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("analytics_events")
        .select(
          "event_name, event_time, session_id, anonymous_visitor_id, page_path, referrer_host, vehicle_id, cart_item_count, cart_value_usd, metadata, user_agent_category"
        )
        .gte("event_time", startIso)
        .lt("event_time", endIso)
        .order("event_time", { ascending: false })
        .range(from, to);

      if (error) {
        const msg = String(error.message || "");
        const missing =
          error.code === "PGRST205" ||
          msg.toLowerCase().includes("does not exist") ||
          msg.toLowerCase().includes("schema cache");
        console.error("[analytics.aggregate]", error.code ?? "", msg.slice(0, 160));
        return {
          ok: false,
          rows: [],
          error: missing
            ? "该统计项暂无可用数据来源"
            : "数据加载失败，请稍后重试",
          tableMissing: missing,
        };
      }

      const batch = (data ?? []) as EventRow[];
      rows.push(...batch);
      if (batch.length < EVENT_PAGE_SIZE) break;
      from += EVENT_PAGE_SIZE;
    }

    return {
      ok: true,
      rows,
      error: null,
      tableMissing: false,
    };
  } catch (err) {
    console.error(
      "[analytics.aggregate]",
      err instanceof Error ? err.message.slice(0, 160) : "unknown"
    );
    return {
      ok: false,
      rows: [],
      error: "数据加载失败，请稍后重试",
      tableMissing: false,
    };
  }
}

export async function getAnalyticsDashboardBlock(options: {
  range: {
    preset: StatisticsRangePreset;
    startIso: string;
    endIso: string;
    startLabel: string;
    endLabel: string;
  };
  loadedAtLabel: string;
  funnelFilters?: {
    source?: string | null;
    device?: string | null;
  };
}): Promise<AnalyticsDashboardBlock> {
  const { range, loadedAtLabel } = options;
  const sourceFilter: FunnelSourceFilter = parseTrafficSourceFilter(
    options.funnelFilters?.source ?? null
  );
  const deviceFilter: FunnelDeviceFilter =
    options.funnelFilters?.device === "mobile" ||
    options.funnelFilters?.device === "desktop" ||
    options.funnelFilters?.device === "tablet" ||
    options.funnelFilters?.device === "other"
      ? options.funnelFilters.device
      : "all";
  const current = await loadEvents(range.startIso, range.endIso);
  const prev = previousRange(range.startIso, range.endIso);
  const previous = current.ok
    ? await loadEvents(prev.startIso, prev.endIso)
    : { ok: false, rows: [] as EventRow[], error: null, tableMissing: false };

  let totalEvents: number | null = null;
  let latestEventAt: string | null = null;
  if (current.ok) {
    try {
      const supabase = getSupabaseAdmin();
      const { count } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true });
      totalEvents = count ?? 0;
      const { data: latest } = await supabase
        .from("analytics_events")
        .select("event_time")
        .order("event_time", { ascending: false })
        .limit(1);
      latestEventAt = latest?.[0]?.event_time
        ? String(latest[0].event_time)
        : null;
    } catch {
      // ignore optional totals
    }
  }

  const emptyWaiting =
    current.ok && current.rows.length === 0 && (totalEvents ?? 0) === 0;

  const source = {
    id: "analytics_events",
    name: "analytics_events（第一方事件）",
    available: current.ok,
    detail: current.ok
      ? emptyWaiting
        ? "统计功能已启用，等待新的访问数据。"
        : `所选范围 ${current.rows.length} 条事件`
      : "事件表不可用",
    lastLoadedAt: current.ok ? loadedAtLabel : null,
    latestEventAt,
    totalEvents,
    periodEvents: current.ok ? current.rows.length : null,
    error: current.error,
  };

  if (!current.ok) {
    return {
      available: false,
      emptyWaiting: false,
      error: current.error,
      source,
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
      trafficSources: emptyTrafficSources(),
      devices: emptyDevices(),
      geo: {
        available: false,
        message: GEO_UNAVAILABLE_MESSAGE,
      },
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
        filters: {
          source: sourceFilter,
          device: deviceFilter,
        },
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
  }

  const rows = current.rows;
  const pageViews = rows.filter((r) => r.event_name === "page_view");
  const detailViews = rows.filter((r) => r.event_name === "vehicle_detail_view");
  const whatsapp = rows.filter((r) => r.event_name === "whatsapp_click");
  const cartAdds = rows.filter((r) => r.event_name === "cart_add");
  const cartViews = rows.filter((r) => r.event_name === "cart_view");
  const cartCheckouts = rows.filter((r) => r.event_name === "cart_checkout_click");
  const quotes = rows.filter((r) => r.event_name === "quote_download");

  const sessions = distinct(pageViews.map((r) => r.session_id));
  const uniqueVisitors = distinct(pageViews.map((r) => r.anonymous_visitor_id));

  function classifySource(row: EventRow): TrafficSource {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
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

  function classifyDevice(
    row: EventRow
  ): "mobile" | "desktop" | "tablet" | "other" {
    const ua = (row.user_agent_category ?? "").toLowerCase();
    if (ua === "mobile") return "mobile";
    if (ua === "tablet") return "tablet";
    if (ua === "desktop") return "desktop";
    return "other";
  }

  function rowMatchesFunnelFilters(row: EventRow): boolean {
    if (sourceFilter !== "all" && classifySource(row) !== sourceFilter) {
      return false;
    }
    if (deviceFilter !== "all" && classifyDevice(row) !== deviceFilter) {
      return false;
    }
    return true;
  }

  const funnelRows = rows.filter(rowMatchesFunnelFilters);
  const funnelPageViews = funnelRows.filter((r) => r.event_name === "page_view");
  const funnelDetailViews = funnelRows.filter(
    (r) => r.event_name === "vehicle_detail_view"
  );
  const funnelCartAdds = funnelRows.filter((r) => r.event_name === "cart_add");
  const funnelWhatsapp = funnelRows.filter(
    (r) => r.event_name === "whatsapp_click"
  );

  // Conversion funnel: distinct visitors by stage (dedupe via anonymous_visitor_id).
  const homeVisitors = distinct(
    funnelPageViews
      .filter((r) => normalizePagePath(r.page_path) === "/")
      .map((r) => r.anonymous_visitor_id)
  );
  const vehicleDetailVisitors = distinct(
    funnelDetailViews.map((r) => r.anonymous_visitor_id)
  );
  const cartAddVisitors = distinct(
    funnelCartAdds.map((r) => r.anonymous_visitor_id)
  );
  const whatsappClickVisitors = distinct(
    funnelWhatsapp.map((r) => r.anonymous_visitor_id)
  );

  const pctOrNull = (part: number, total: number): number | null =>
    total <= 0 ? null : pct(part, total);

  const funnel = {
    filters: {
      source: sourceFilter,
      device: deviceFilter,
    },
    homeVisitors,
    vehicleDetailVisitors,
    cartAddVisitors,
    whatsappClickVisitors,
    fromPrev: {
      vehicleDetail: pctOrNull(vehicleDetailVisitors, homeVisitors),
      cartAdd: pctOrNull(cartAddVisitors, vehicleDetailVisitors),
      whatsappClick: pctOrNull(whatsappClickVisitors, cartAddVisitors),
    },
    fromHome: {
      vehicleDetail: pctOrNull(vehicleDetailVisitors, homeVisitors),
      cartAdd: pctOrNull(cartAddVisitors, homeVisitors),
      whatsappClick: pctOrNull(whatsappClickVisitors, homeVisitors),
    },
  };

  const website = {
    pageViews: pageViews.length,
    uniqueVisitors,
    sessions,
    vehicleDetailViews: detailViews.length,
    pagesPerSession:
      sessions > 0 ? Math.round((pageViews.length / sessions) * 10) / 10 : null,
  };

  // popular pages
  const pageMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (const r of pageViews) {
    const path = normalizePagePath(r.page_path);
    const cur = pageMap.get(path) ?? { views: 0, visitors: new Set() };
    cur.views += 1;
    if (r.anonymous_visitor_id) cur.visitors.add(r.anonymous_visitor_id);
    pageMap.set(path, cur);
  }
  const popularPages = [...pageMap.entries()]
    .map(([path, v]) => ({
      path: friendlyPageLabel(path),
      views: v.views,
      percent: pct(v.views, pageViews.length),
      visitors: v.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // popular vehicles
  const vehicleIds = new Set<string>();
  const detailMap = new Map<string, number>();
  const waMap = new Map<string, number>();
  const quoteMap = new Map<string, number>();
  for (const r of detailViews) {
    if (!r.vehicle_id) continue;
    vehicleIds.add(r.vehicle_id);
    detailMap.set(r.vehicle_id, (detailMap.get(r.vehicle_id) ?? 0) + 1);
  }
  for (const r of whatsapp) {
    if (!r.vehicle_id) continue;
    vehicleIds.add(r.vehicle_id);
    waMap.set(r.vehicle_id, (waMap.get(r.vehicle_id) ?? 0) + 1);
  }
  for (const r of quotes) {
    if (!r.vehicle_id) continue;
    vehicleIds.add(r.vehicle_id);
    quoteMap.set(r.vehicle_id, (quoteMap.get(r.vehicle_id) ?? 0) + 1);
  }

  const vehicleMeta = new Map<string, { title: string; coverUrl: string | null }>();
  if (vehicleIds.size > 0) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, title_en, main_image_url, photos")
        .in("id", [...vehicleIds].slice(0, 50));
      for (const v of data ?? []) {
        const title =
          (v.title_en as string | null)?.trim() ||
          `${v.brand ?? ""} ${v.model ?? ""}`.trim() ||
          String(v.id);
        const cover =
          (v.main_image_url as string | null)?.trim() ||
          (Array.isArray(v.photos) ? (v.photos[0] as string | undefined) : null) ||
          null;
        vehicleMeta.set(String(v.id), { title, coverUrl: cover });
      }
    } catch {
      // ignore join failures
    }
  }

  const popularVehicles = [...vehicleIds]
    .map((id) => ({
      vehicleId: id,
      title: vehicleMeta.get(id)?.title ?? id,
      coverUrl: vehicleMeta.get(id)?.coverUrl ?? null,
      detailViews: detailMap.get(id) ?? 0,
      whatsappClicks: waMap.get(id) ?? 0,
      quoteDownloads: quoteMap.get(id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.detailViews + b.whatsappClicks + b.quoteDownloads -
        (a.detailViews + a.whatsappClicks + a.quoteDownloads)
    )
    .slice(0, 8);

  const sourceVisitorSets = new Map<TrafficSource, Set<string>>();
  const sourceEventCounts = new Map<TrafficSource, number>();
  for (const id of TRAFFIC_SOURCE_IDS) {
    sourceVisitorSets.set(id, new Set());
    sourceEventCounts.set(id, 0);
  }
  const deviceVisitorSets: Record<
    "mobile" | "desktop" | "tablet" | "other",
    Set<string>
  > = {
    mobile: new Set(),
    desktop: new Set(),
    tablet: new Set(),
    other: new Set(),
  };
  const deviceEventCounts: Record<
    "mobile" | "desktop" | "tablet" | "other",
    number
  > = {
    mobile: 0,
    desktop: 0,
    tablet: 0,
    other: 0,
  };
  for (const r of rows) {
    const source = classifySource(r);
    sourceEventCounts.set(source, (sourceEventCounts.get(source) ?? 0) + 1);
    if (r.anonymous_visitor_id) {
      sourceVisitorSets.get(source)?.add(r.anonymous_visitor_id);
    }
    const device = classifyDevice(r);
    deviceEventCounts[device] += 1;
    if (r.anonymous_visitor_id) deviceVisitorSets[device].add(r.anonymous_visitor_id);
  }
  const trafficSources = TRAFFIC_SOURCE_IDS.map((source) => {
    const events = sourceEventCounts.get(source) ?? 0;
    return {
      source,
      label: trafficSourceLabel(source),
      events,
      visitors: sourceVisitorSets.get(source)?.size ?? 0,
      percent: pct(events, rows.length),
    };
  });
  const deviceLabels = {
    mobile: "移动端",
    desktop: "电脑端",
    tablet: "平板",
    other: "其他",
  } as const;
  const devices = (["mobile", "desktop", "tablet", "other"] as const).map(
    (device) => ({
      device,
      label: deviceLabels[device],
      events: deviceEventCounts[device],
      visitors: deviceVisitorSets[device].size,
      percent: pct(deviceEventCounts[device], rows.length),
    })
  );

  // whatsapp breakdown
  const sourceMap = new Map<string, number>();
  const contactMap = new Map<string, number>();
  let vehicleDetail = 0;
  let cartCheckout = 0;
  let floatingButton = 0;
  let contactPage = 0;
  for (const r of whatsapp) {
    const meta = r.metadata ?? {};
    const source = String(meta.source ?? meta.source_page ?? "other");
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
    const contact = String(meta.assigned_contact_name ?? "").trim();
    if (contact) contactMap.set(contact, (contactMap.get(contact) ?? 0) + 1);
    if (source.includes("vehicle")) vehicleDetail += 1;
    if (source.includes("cart")) cartCheckout += 1;
    if (source.includes("floating")) floatingButton += 1;
    if (source.includes("contact")) contactPage += 1;
  }

  const whatsappBlock = {
    totalClicks: whatsapp.length,
    uniqueVisitors: distinct(whatsapp.map((r) => r.anonymous_visitor_id)),
    bySource: [...sourceMap.entries()]
      .map(([source, count]) => ({
        source,
        count,
        percent: pct(count, whatsapp.length),
      }))
      .sort((a, b) => b.count - a.count),
    byContact: [...contactMap.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percent: pct(count, whatsapp.length),
      }))
      .sort((a, b) => b.count - a.count),
    vehicleDetail,
    cartCheckout,
    floatingButton,
    contactPage,
  };

  const addVisitors = distinct(cartAdds.map((r) => r.anonymous_visitor_id));
  const viewVisitors = distinct(cartViews.map((r) => r.anonymous_visitor_id));
  const checkoutVisitors = distinct(
    cartCheckouts.map((r) => r.anonymous_visitor_id)
  );
  const conversionRate =
    addVisitors > 0
      ? Math.round((checkoutVisitors / addVisitors) * 1000) / 10
      : null;

  const cartItemSamples = cartViews
    .map((r) => r.cart_item_count)
    .filter((n): n is number => typeof n === "number" && n >= 0);
  const cartValueSamples = cartViews
    .map((r) => Number(r.cart_value_usd))
    .filter((n) => Number.isFinite(n) && n >= 0);

  const cart = {
    addCount: cartAdds.length,
    addVisitors,
    viewVisitors,
    checkoutVisitors,
    conversionRate,
    avgCartItems:
      cartItemSamples.length > 0
        ? Math.round(
            (cartItemSamples.reduce((s, n) => s + n, 0) / cartItemSamples.length) *
              10
          ) / 10
        : null,
    avgCartValue:
      cartValueSamples.length > 0
        ? Math.round(
            cartValueSamples.reduce((s, n) => s + n, 0) / cartValueSamples.length
          )
        : null,
    funnel: [
      { stage: "加入购物车", visitors: addVisitors },
      { stage: "查看购物车", visitors: viewVisitors },
      { stage: "发起 WhatsApp 结算", visitors: checkoutVisitors },
    ],
  };

  const quoteVehicleIds = new Set(
    quotes.map((r) => r.vehicle_id).filter(Boolean) as string[]
  );
  const quoteTop = [...quoteMap.entries()]
    .map(([vehicleId, downloads]) => ({
      vehicleId,
      title: vehicleMeta.get(vehicleId)?.title ?? vehicleId,
      downloads,
    }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 8);

  const quotesBlock = {
    downloads: quotes.length,
    uniqueVisitors: distinct(quotes.map((r) => r.anonymous_visitor_id)),
    vehicleCount: quoteVehicleIds.size,
    avgPerVehicle:
      quoteVehicleIds.size > 0
        ? Math.round((quotes.length / quoteVehicleIds.size) * 10) / 10
        : null,
    topVehicles: quoteTop,
    trend: buildTrend(quotes.map((r) => ({ ...r, event_name: "page_view" })), range).map(
      (b) => ({ key: b.key, label: b.label, count: b.pageViews })
    ),
  };

  // previous period for cards
  const prevRows = previous.ok ? previous.rows : [];
  const prevPageViews = prevRows.filter((r) => r.event_name === "page_view");
  const prevWa = prevRows.filter((r) => r.event_name === "whatsapp_click");
  const prevAdds = prevRows.filter((r) => r.event_name === "cart_add");
  const prevCheckouts = prevRows.filter(
    (r) => r.event_name === "cart_checkout_click"
  );
  const prevQuotes = prevRows.filter((r) => r.event_name === "quote_download");
  const prevAddVisitors = distinct(prevAdds.map((r) => r.anonymous_visitor_id));
  const prevCheckoutVisitors = distinct(
    prevCheckouts.map((r) => r.anonymous_visitor_id)
  );

  return {
    available: true,
    emptyWaiting,
    error: null,
    source,
    website,
    websiteTrend: buildTrend(rows, range),
    popularPages,
    popularVehicles,
    trafficSources,
    devices,
    geo: {
      available: false,
      message: GEO_UNAVAILABLE_MESSAGE,
    },
    whatsapp: whatsappBlock,
    cart,
    quotes: quotesBlock,
    summaryCards: {
      pageViews: website.pageViews,
      uniqueVisitors: website.uniqueVisitors,
      whatsappClicks: whatsappBlock.totalClicks,
      cartConversionRate: cart.conversionRate,
      quoteDownloads: quotesBlock.downloads,
      prevPageViews: previous.ok ? prevPageViews.length : null,
      prevUniqueVisitors: previous.ok
        ? distinct(prevPageViews.map((r) => r.anonymous_visitor_id))
        : null,
      prevWhatsappClicks: previous.ok ? prevWa.length : null,
      prevCartConversionRate:
        previous.ok && prevAddVisitors > 0
          ? Math.round((prevCheckoutVisitors / prevAddVisitors) * 1000) / 10
          : null,
      prevQuoteDownloads: previous.ok ? prevQuotes.length : null,
    },
    funnel,
  };
}
