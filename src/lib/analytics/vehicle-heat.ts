import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  StatisticsRangePreset,
  VehicleHeatDashboard,
  VehicleHeatRow,
  VehicleHeatSort,
  VehicleHeatStatusFilter,
  VehicleHeatTrendPoint,
} from "@/lib/admin/statistics-types";

export type {
  VehicleHeatDashboard,
  VehicleHeatRow,
  VehicleHeatSort,
  VehicleHeatStatusFilter,
  VehicleHeatTrendPoint,
};

type EventRow = {
  event_name: string;
  event_time: string;
  anonymous_visitor_id: string | null;
  vehicle_id: string | null;
  metadata: Record<string, unknown> | null;
};

function shanghaiYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function logSafe(err: unknown) {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : err instanceof Error
        ? err.message
        : String(err);
  console.error("[analytics.vehicleHeat]", message.slice(0, 200));
}

function heatScore(row: {
  uniqueViewers: number;
  whatsappClicks: number;
  cartAdds: number;
  quoteDownloads: number;
}): number {
  return (
    row.uniqueViewers * 1 +
    row.whatsappClicks * 5 +
    row.cartAdds * 3 +
    row.quoteDownloads * 5
  );
}

function matchesStatusFilter(
  status: string | null,
  filter: VehicleHeatStatusFilter
): boolean {
  const s = status ?? "在售";
  if (filter === "all") return true;
  if (filter === "on_sale") return s === "在售";
  if (filter === "sold") return s === "已售";
  if (filter === "delisted") return s === "已下架";
  return true;
}

export function sortVehicleHeatRows(
  rows: VehicleHeatRow[],
  sort: VehicleHeatSort
): VehicleHeatRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "views":
        return b.detailViews - a.detailViews || b.uniqueViewers - a.uniqueViewers;
      case "whatsapp":
        return b.whatsappClicks - a.whatsappClicks;
      case "cart":
        return b.cartAdds - a.cartAdds;
      case "quotes":
        return b.quoteDownloads - a.quoteDownloads;
      case "rate_high":
        return (b.inquiryRate ?? -1) - (a.inquiryRate ?? -1);
      case "rate_low": {
        const ar = a.inquiryRate;
        const br = b.inquiryRate;
        if (ar == null && br == null) return b.uniqueViewers - a.uniqueViewers;
        if (ar == null) return 1;
        if (br == null) return -1;
        return ar - br || b.uniqueViewers - a.uniqueViewers;
      }
      case "heat":
      default:
        return b.heatScore - a.heatScore || b.detailViews - a.detailViews;
    }
  });
  return copy;
}

export function filterVehicleHeatRows(
  rows: VehicleHeatRow[],
  statusFilter: VehicleHeatStatusFilter
): VehicleHeatRow[] {
  return rows.filter((r) => {
    if (statusFilter === "all") return true;
    if (r.missing) return false;
    return matchesStatusFilter(r.status, statusFilter);
  });
}

export async function getVehicleHeatDashboard(options: {
  range: {
    preset: StatisticsRangePreset;
    startIso: string;
    endIso: string;
    startLabel: string;
    endLabel: string;
  };
}): Promise<VehicleHeatDashboard> {
  try {
    const supabase = getSupabaseAdmin();
    const rows: EventRow[] = [];
    let from = 0;
    const pageSize = 1000;
    let error: { code?: string; message?: string } | null = null;
    while (from < 50_000) {
      const page = await supabase
        .from("analytics_events")
        .select(
          "event_name, event_time, anonymous_visitor_id, vehicle_id, metadata"
        )
        .gte("event_time", options.range.startIso)
        .lt("event_time", options.range.endIso)
        .not("vehicle_id", "is", null)
        .in("event_name", [
          "vehicle_detail_view",
          "whatsapp_click",
          "cart_add",
          "quote_download",
        ])
        .order("event_time", { ascending: false })
        .range(from, from + pageSize - 1);
      if (page.error) {
        error = page.error;
        break;
      }
      const batch = (page.data ?? []) as EventRow[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    if (error) {
      logSafe(error);
      const missing =
        error.code === "PGRST205" ||
        String(error.message || "")
          .toLowerCase()
          .includes("does not exist");
      return emptyHeat(
        false,
        missing
          ? "该统计项暂无可用数据来源"
          : "车辆热度数据加载失败，请稍后重试"
      );
    }

    if (rows.length === 0) {
      return emptyHeat(true, null);
    }

    type Acc = {
      detailViews: number;
      viewVisitors: Set<string>;
      whatsappClicks: number;
      waVisitors: Set<string>;
      cartAdds: number;
      quoteDownloads: number;
      waSources: Map<string, number>;
    };

    const byVehicle = new Map<string, Acc>();

    for (const r of rows) {
      const vid = r.vehicle_id?.trim();
      if (!vid) continue;
      const acc =
        byVehicle.get(vid) ??
        ({
          detailViews: 0,
          viewVisitors: new Set(),
          whatsappClicks: 0,
          waVisitors: new Set(),
          cartAdds: 0,
          quoteDownloads: 0,
          waSources: new Map(),
        } satisfies Acc);

      if (r.event_name === "vehicle_detail_view") {
        acc.detailViews += 1;
        if (r.anonymous_visitor_id) acc.viewVisitors.add(r.anonymous_visitor_id);
      } else if (r.event_name === "whatsapp_click") {
        acc.whatsappClicks += 1;
        if (r.anonymous_visitor_id) acc.waVisitors.add(r.anonymous_visitor_id);
        const source = String(
          (r.metadata as { source?: string } | null)?.source ?? "other"
        );
        acc.waSources.set(source, (acc.waSources.get(source) ?? 0) + 1);
      } else if (r.event_name === "cart_add") {
        acc.cartAdds += 1;
      } else if (r.event_name === "quote_download") {
        acc.quoteDownloads += 1;
      }
      byVehicle.set(vid, acc);
    }

    const ids = [...byVehicle.keys()];
    const meta = new Map<
      string,
      {
        title: string;
        coverUrl: string | null;
        status: string | null;
        priceLabel: string | null;
        year: number | null;
        brand: string | null;
        model: string | null;
      }
    >();

    if (ids.length > 0) {
      try {
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select(
            "id, brand, model, title_en, main_image_url, photos, status, fob_price, currency, year"
          )
          .in("id", ids.slice(0, 200));
        for (const v of vehicles ?? []) {
          const title =
            (v.title_en as string | null)?.trim() ||
            `${v.brand ?? ""} ${v.model ?? ""}`.trim() ||
            String(v.id);
          const cover =
            (v.main_image_url as string | null)?.trim() ||
            (Array.isArray(v.photos)
              ? (v.photos[0] as string | undefined)
              : null) ||
            null;
          const price = Number(v.fob_price);
          meta.set(String(v.id), {
            title,
            coverUrl: cover,
            status: (v.status as string | null) ?? null,
            priceLabel: Number.isFinite(price)
              ? `${v.currency || "USD"} ${Math.round(price).toLocaleString("en-US")}`
              : null,
            year: v.year != null ? Number(v.year) : null,
            brand: (v.brand as string | null) ?? null,
            model: (v.model as string | null) ?? null,
          });
        }
      } catch (err) {
        logSafe(err);
      }
    }

    const rankingAll: VehicleHeatRow[] = [];
    for (const [vehicleId, acc] of byVehicle) {
      const m = meta.get(vehicleId);
      const uniqueViewers = acc.viewVisitors.size;
      const whatsappVisitors = acc.waVisitors.size;
      const inquiryRate =
        uniqueViewers > 0
          ? Math.round((whatsappVisitors / uniqueViewers) * 1000) / 10
          : null;
      rankingAll.push({
        vehicleId,
        title: m?.title ?? "车辆记录已不存在",
        coverUrl: m?.coverUrl ?? null,
        status: m?.status ?? null,
        priceLabel: m?.priceLabel ?? null,
        year: m?.year ?? null,
        brand: m?.brand ?? null,
        model: m?.model ?? null,
        missing: !m,
        detailViews: acc.detailViews,
        uniqueViewers,
        whatsappClicks: acc.whatsappClicks,
        whatsappVisitors,
        cartAdds: acc.cartAdds,
        quoteDownloads: acc.quoteDownloads,
        inquiryRate,
        heatScore: heatScore({
          uniqueViewers,
          whatsappClicks: acc.whatsappClicks,
          cartAdds: acc.cartAdds,
          quoteDownloads: acc.quoteDownloads,
        }),
        waSources: [...acc.waSources.entries()]
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count),
      });
    }

    // Default leaders / insight sections use 在售 focus
    const onSale = filterVehicleHeatRows(rankingAll, "on_sale");
    const byViews = sortVehicleHeatRows(onSale, "views");
    const byWa = sortVehicleHeatRows(onSale, "whatsapp");
    const byCart = sortVehicleHeatRows(onSale, "cart");
    const byQuotes = sortVehicleHeatRows(onSale, "quotes");

    const withRate = onSale.filter(
      (r) => r.uniqueViewers >= 5 && r.inquiryRate != null
    );
    let highViewLowInquiry: VehicleHeatRow[] = [];
    let lowViewHighInquiry: VehicleHeatRow[] = [];
    let sampleNote: string | null = null;

    if (withRate.length < 5) {
      sampleNote = "当前样本不足，暂时无法分析咨询率";
    } else {
      const viewers = withRate.map((r) => r.uniqueViewers).sort((a, b) => a - b);
      const rates = withRate.map((r) => r.inquiryRate!).sort((a, b) => a - b);
      const viewP75 =
        viewers[Math.floor(viewers.length * 0.75)] ??
        viewers[viewers.length - 1]!;
      const viewP40 = viewers[Math.floor(viewers.length * 0.4)] ?? viewers[0]!;
      const rateMedian = rates[Math.floor(rates.length / 2)] ?? 0;
      const rateP75 = rates[Math.floor(rates.length * 0.75)] ?? rateMedian;

      highViewLowInquiry = withRate
        .filter(
          (r) =>
            r.uniqueViewers >= viewP75 && (r.inquiryRate ?? 100) <= rateMedian
        )
        .sort((a, b) => b.uniqueViewers - a.uniqueViewers)
        .slice(0, 8);

      lowViewHighInquiry = withRate
        .filter(
          (r) =>
            r.uniqueViewers <= viewP40 &&
            r.uniqueViewers >= 3 &&
            (r.inquiryRate ?? 0) >= rateP75 &&
            r.whatsappClicks >= 2
        )
        .sort((a, b) => (b.inquiryRate ?? 0) - (a.inquiryRate ?? 0))
        .slice(0, 8);

      if (highViewLowInquiry.length === 0 && lowViewHighInquiry.length === 0) {
        sampleNote = "样本较少，暂不判断";
      }
    }

    return {
      available: true,
      empty: rankingAll.length === 0,
      error: null,
      leaders: {
        mostViews: byViews[0] && byViews[0].detailViews > 0 ? byViews[0] : null,
        mostWhatsapp:
          byWa[0] && byWa[0].whatsappClicks > 0 ? byWa[0] : null,
        mostCart: byCart[0] && byCart[0].cartAdds > 0 ? byCart[0] : null,
        mostQuotes:
          byQuotes[0] && byQuotes[0].quoteDownloads > 0 ? byQuotes[0] : null,
      },
      ranking: sortVehicleHeatRows(rankingAll, "heat").slice(0, 80),
      highViewLowInquiry,
      lowViewHighInquiry,
      sampleNote,
    };
  } catch (err) {
    logSafe(err);
    return emptyHeat(false, "车辆热度数据加载失败，请稍后重试");
  }
}

function emptyHeat(
  empty: boolean,
  error: string | null
): VehicleHeatDashboard {
  return {
    available: !error,
    empty,
    error,
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

export async function getVehicleHeatDetail(
  vehicleId: string,
  range: {
    startIso: string;
    endIso: string;
    startLabel: string;
    endLabel: string;
    preset: StatisticsRangePreset;
  }
): Promise<{
  row: VehicleHeatRow | null;
  trend: VehicleHeatTrendPoint[];
  error: string | null;
}> {
  try {
    const block = await getVehicleHeatDashboard({ range });
    const row =
      block.ranking.find((r) => r.vehicleId === vehicleId) ?? null;

    const supabase = getSupabaseAdmin();
    const data: {
      event_name: string;
      event_time: string;
      anonymous_visitor_id: string | null;
      vehicle_id: string | null;
    }[] = [];
    let from = 0;
    const pageSize = 1000;
    while (from < 50_000) {
      const page = await supabase
        .from("analytics_events")
        .select("event_name, event_time, anonymous_visitor_id, vehicle_id")
        .eq("vehicle_id", vehicleId)
        .gte("event_time", range.startIso)
        .lt("event_time", range.endIso)
        .in("event_name", [
          "vehicle_detail_view",
          "whatsapp_click",
          "cart_add",
          "quote_download",
        ])
        .order("event_time", { ascending: false })
        .range(from, from + pageSize - 1);
      if (page.error) throw page.error;
      const batch = page.data ?? [];
      data.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    const dayMap = new Map<
      string,
      {
        views: number;
        visitors: Set<string>;
        wa: number;
        cart: number;
        quotes: number;
      }
    >();

    for (const r of data ?? []) {
      const key = shanghaiYmd(new Date(r.event_time));
      const bucket =
        dayMap.get(key) ??
        {
          views: 0,
          visitors: new Set<string>(),
          wa: 0,
          cart: 0,
          quotes: 0,
        };
      if (r.event_name === "vehicle_detail_view") {
        bucket.views += 1;
        if (r.anonymous_visitor_id) bucket.visitors.add(r.anonymous_visitor_id);
      } else if (r.event_name === "whatsapp_click") bucket.wa += 1;
      else if (r.event_name === "cart_add") bucket.cart += 1;
      else if (r.event_name === "quote_download") bucket.quotes += 1;
      dayMap.set(key, bucket);
    }

    const trend: VehicleHeatTrendPoint[] = [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, b]) => ({
        key,
        label: key.slice(5),
        views: b.views,
        uniqueVisitors: b.visitors.size,
        whatsappClicks: b.wa,
        cartAdds: b.cart,
        quoteDownloads: b.quotes,
      }));

    return { row, trend, error: null };
  } catch (err) {
    logSafe(err);
    return {
      row: null,
      trend: [],
      error: "车辆热度数据加载失败，请稍后重试",
    };
  }
}
