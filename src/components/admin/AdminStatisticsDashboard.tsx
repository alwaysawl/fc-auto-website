"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  StatisticsPayload,
  StatisticsRangePreset,
} from "@/lib/admin/statistics-types";
import VehicleHeatSection from "@/components/admin/VehicleHeatSection";

type LoadState = "loading" | "ready" | "error";

const PRESETS: { id: StatisticsRangePreset; label: string }[] = [
  { id: "today", label: "今天" },
  { id: "7d", label: "最近 7 天" },
  { id: "30d", label: "最近 30 天" },
  { id: "month", label: "本月" },
  { id: "custom", label: "自定义日期" },
];

function formatMoney(value: number | null, currency: string): string {
  if (value == null) return "—";
  try {
    if ((currency || "USD").toUpperCase() === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-US")}`;
  }
}

function formatShanghai(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function MetricCard({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div className="mt-1.5 text-2xl font-bold text-slate-800 break-words">
        {children}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-slate-600 py-2">{text}</p>;
}

function StatusBarChart({
  items,
}: {
  items: { label: string; count: number }[];
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-3" role="img" aria-label="车辆状态分布柱状图">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="tabular-nums text-slate-800">{item.count}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1E293B]"
              style={{
                width: `${Math.max((item.count / max) * 100, item.count > 0 ? 4 : 0)}%`,
                backgroundColor:
                  item.label === "在售"
                    ? "#1E293B"
                    : item.label === "草稿"
                      ? "#94a3b8"
                      : item.label === "已售"
                        ? "#FACC15"
                        : "#cbd5e1",
              }}
            />
          </div>
        </div>
      ))}
      <ul className="flex flex-wrap gap-3 pt-1 text-xs text-slate-700">
        {items.map((item) => (
          <li key={`legend-${item.label}`} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor:
                  item.label === "在售"
                    ? "#1E293B"
                    : item.label === "草稿"
                      ? "#94a3b8"
                      : item.label === "已售"
                        ? "#FACC15"
                        : "#cbd5e1",
              }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendChart({ buckets }: { buckets: { label: string; count: number }[] }) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) {
    return <EmptyLine text="所选时间范围内暂无数据" />;
  }
  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end gap-1 min-h-[140px] min-w-0"
        role="img"
        aria-label="新增车辆趋势图"
      >
        {buckets.map((b) => (
          <div
            key={b.label}
            className="flex flex-col items-center justify-end gap-1 flex-1 min-w-[10px] max-w-[48px]"
          >
            <span className="text-[10px] tabular-nums text-slate-800">
              {b.count > 0 ? b.count : ""}
            </span>
            <div
              className="w-full rounded-t-sm bg-[#FACC15] min-h-[2px]"
              style={{ height: `${Math.max((b.count / max) * 110, b.count > 0 ? 6 : 2)}px` }}
              title={`${b.label}: ${b.count}`}
            />
            <span className="text-[9px] text-slate-600 truncate w-full text-center">
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiTrendChart({
  buckets,
}: {
  buckets: {
    label: string;
    pageViews: number;
    visitors: number;
    sessions: number;
  }[];
}) {
  const max = Math.max(
    ...buckets.flatMap((b) => [b.pageViews, b.visitors, b.sessions]),
    1
  );
  const total = buckets.reduce((s, b) => s + b.pageViews, 0);
  if (total === 0) {
    return <EmptyLine text="所选时间范围内暂无数据" />;
  }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div
          className="flex items-end gap-1.5 min-h-[150px] min-w-0"
          role="img"
          aria-label="网站访问趋势"
        >
          {buckets.map((b) => (
            <div
              key={b.label}
              className="flex flex-col items-center justify-end gap-1 flex-1 min-w-[14px] max-w-[56px]"
            >
              <div className="flex items-end gap-0.5 w-full h-[120px]">
                <div
                  className="flex-1 rounded-t-sm bg-[#1E293B] min-h-[2px]"
                  style={{
                    height: `${Math.max((b.pageViews / max) * 110, b.pageViews > 0 ? 4 : 2)}px`,
                  }}
                  title={`浏览量 ${b.pageViews}`}
                />
                <div
                  className="flex-1 rounded-t-sm bg-[#FACC15] min-h-[2px]"
                  style={{
                    height: `${Math.max((b.visitors / max) * 110, b.visitors > 0 ? 4 : 2)}px`,
                  }}
                  title={`访客 ${b.visitors}`}
                />
                <div
                  className="flex-1 rounded-t-sm bg-slate-400 min-h-[2px]"
                  style={{
                    height: `${Math.max((b.sessions / max) * 110, b.sessions > 0 ? 4 : 2)}px`,
                  }}
                  title={`会话 ${b.sessions}`}
                />
              </div>
              <span className="text-[9px] text-slate-600 truncate w-full text-center">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <ul className="flex flex-wrap gap-3 text-xs text-slate-700">
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#1E293B]" />
          页面浏览量
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#FACC15]" />
          匿名访客
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" />
          会话
        </li>
      </ul>
    </div>
  );
}

function percentChange(
  current: number | null,
  previous: number | null
): string | null {
  if (current == null || previous == null) return null;
  if (previous === 0) {
    if (current === 0) return "0%";
    return null; // avoid infinite %
  }
  const delta = ((current - previous) / previous) * 100;
  if (!Number.isFinite(delta)) return null;
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

function ChangeHint({
  current,
  previous,
  isRate,
}: {
  current: number | null;
  previous: number | null;
  isRate?: boolean;
}) {
  const label = percentChange(current, previous);
  if (label == null) {
    return <span className="text-[11px] text-slate-600">暂无可比数据</span>;
  }
  const up = label.startsWith("+") && label !== "+0%";
  const down = label.startsWith("-");
  return (
    <span
      className={`text-[11px] ${
        up ? "text-emerald-700" : down ? "text-amber-700" : "text-slate-600"
      }`}
    >
      较上期 {label}
      {isRate ? "（百分点同比）" : ""}
      {previous != null && (
        <span className="text-slate-600">
          {" "}
          · 上期 {isRate ? `${previous}%` : previous}
        </span>
      )}
    </span>
  );
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    vehicle_card: "车辆卡片",
    floating_button: "悬浮按钮",
    header: "页头",
    vehicle_detail: "车辆详情",
    cart_checkout: "购物车结算",
    quotation: "报价相关",
    contact_page: "联系页面",
    inventory: "库存列表",
    home: "首页",
    footer: "页脚",
    shipping_calculator: "运费估算",
    other: "其他",
  };
  return map[source] ?? source;
}

function RankedList({
  title,
  items,
  available,
  error,
}: {
  title: string;
  items: { name: string; count: number; percent: number }[];
  available: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
      {!available ? (
        <EmptyLine text={error || "该统计项暂无可用数据来源"} />
      ) : items.length === 0 ? (
        <EmptyLine text="所选时间范围内暂无数据" />
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 10).map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between gap-3 text-sm border-b border-slate-50 pb-2 last:border-0"
            >
              <span className="font-medium text-slate-700 truncate min-w-0">
                {item.name}
              </span>
              <span className="tabular-nums text-slate-800 flex-shrink-0">
                {item.count}（{item.percent}%）
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminStatisticsDashboard({
  initial,
}: {
  initial: StatisticsPayload;
}) {
  type FunnelSource =
    | "all"
    | "facebook"
    | "google"
    | "direct"
    | "other"
    | "unknown";
  type FunnelDevice = "all" | "mobile" | "desktop" | "tablet" | "other";

  const [preset, setPreset] = useState<StatisticsRangePreset>(
    initial.range.preset
  );
  const [customStart, setCustomStart] = useState(initial.range.startLabel);
  const [customEnd, setCustomEnd] = useState(initial.range.endLabel);
  const [data, setData] = useState<StatisticsPayload>(initial);
  const [state, setState] = useState<LoadState>("ready");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [funnelSource, setFunnelSource] = useState<FunnelSource>(
    initial.analytics.funnel.filters.source
  );
  const [funnelDevice, setFunnelDevice] = useState<FunnelDevice>(
    initial.analytics.funnel.filters.device
  );
  const funnel = data.analytics.funnel;

  const load = useCallback(
    async (
      nextPreset: StatisticsRangePreset,
      start: string,
      end: string,
      source: FunnelSource,
      device: FunnelDevice
    ) => {
      setState("loading");
      try {
        const params = new URLSearchParams({ preset: nextPreset });
        if (nextPreset === "custom") {
          params.set("start", start);
          params.set("end", end);
        }
        params.set("source", source);
        params.set("device", device);
        const res = await fetch(`/api/admin/statistics?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setState("error");
          return;
        }
        setData(json as StatisticsPayload);
        setState("ready");
      } catch {
        setState("error");
      }
    },
    []
  );

  useEffect(() => {
    // Keep custom inputs in sync when preset changes away from custom
    if (preset !== "custom") {
      setCustomStart(data.range.startLabel);
      setCustomEnd(data.range.endLabel);
    }
  }, [preset, data.range.startLabel, data.range.endLabel]);

  useEffect(() => {
    setFunnelSource(data.analytics.funnel.filters.source);
    setFunnelDevice(data.analytics.funnel.filters.device);
  }, [data.analytics.funnel.filters.source, data.analytics.funnel.filters.device]);

  const periodCards = useMemo(
    () => [
      { key: "newVehicles", label: "新增车辆", metric: data.period.newVehicles },
      { key: "inquiries", label: "询盘数量", metric: data.period.inquiries },
      { key: "quotes", label: "报价数量", metric: data.period.quotes },
      {
        key: "whatsappAssignments",
        label: "WhatsApp 分配次数",
        metric: data.period.whatsappAssignments,
      },
      {
        key: "pdfDownloads",
        label: "PDF 报价下载次数",
        metric: data.period.pdfDownloads,
      },
      {
        key: "completedSales",
        label: "已完成销售数量",
        metric: data.period.completedSales,
        hint: "按「已售」状态且更新时间在范围内统计",
      },
    ],
    [data.period]
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">数据统计</h1>
          <p className="text-sm text-slate-600 mt-1">
            查看车辆、询盘、报价与销售分配的真实经营数据。
          </p>
          <p className="text-xs text-slate-600 mt-1">
            时区：{data.timezone} · 范围 {data.range.startLabel} ~{" "}
            {data.range.endLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={state === "loading"}
            onClick={() =>
              void load(preset, customStart, customEnd, funnelSource, funnelDevice)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {state === "loading" ? "刷新中…" : "刷新数据"}
          </button>
          <span className="text-xs text-slate-600">
            上次更新：{formatShanghai(data.generatedAt)}
          </span>
        </div>
      </div>

      {/* Date filter */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-slate-800">时间范围</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPreset(p.id);
                if (p.id !== "custom") {
                  void load(
                    p.id,
                    customStart,
                    customEnd,
                    funnelSource,
                    funnelDevice
                  );
                }
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                preset === p.id
                  ? "bg-[#1E293B] text-[#FACC15] border-[#1E293B]"
                  : "bg-white text-[#1E293B] border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="text-slate-600">开始日期</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B] [color-scheme:light]"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">结束日期</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B] [color-scheme:light]"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                void load(
                  "custom",
                  customStart,
                  customEnd,
                  funnelSource,
                  funnelDevice
                )
              }
              className="rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-slate-800 hover:brightness-95"
            >
              应用
            </button>
          </div>
        )}
        <p className="text-xs text-slate-600">
          时间筛选仅作用于经营活动指标；库存状态卡片始终显示当前实时库存。
        </p>
      </section>

      {state === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          数据加载失败，请稍后重试
        </div>
      )}

      {/* Analytics summary */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-1">
          网站访问与转化摘要
        </h2>
        <p className="text-xs text-slate-600 mb-3">
          第一方匿名统计 · 范围 {data.range.startLabel} ~ {data.range.endLabel} ·
          不存储电话、邮箱、VIN 或完整 IP
        </p>
        {!data.analytics?.available ? (
          <EmptyLine
            text={data.analytics?.error || "该统计项暂无可用数据来源"}
          />
        ) : data.analytics.emptyWaiting ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            统计功能已启用，等待新的访问数据。
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <MetricCard label="页面浏览量">
              <div>{data.analytics.summaryCards.pageViews}</div>
              <ChangeHint
                current={data.analytics.summaryCards.pageViews}
                previous={data.analytics.summaryCards.prevPageViews}
              />
            </MetricCard>
            <MetricCard label="独立访客" hint="匿名访客标识，非精确人数">
              <div>{data.analytics.summaryCards.uniqueVisitors}</div>
              <ChangeHint
                current={data.analytics.summaryCards.uniqueVisitors}
                previous={data.analytics.summaryCards.prevUniqueVisitors}
              />
            </MetricCard>
            <MetricCard label="WhatsApp 点击">
              <div>{data.analytics.summaryCards.whatsappClicks}</div>
              <ChangeHint
                current={data.analytics.summaryCards.whatsappClicks}
                previous={data.analytics.summaryCards.prevWhatsappClicks}
              />
            </MetricCard>
            <MetricCard
              label="购物车转化率"
              hint="结算访客 ÷ 加购访客"
            >
              {data.analytics.summaryCards.cartConversionRate == null ? (
                <span className="text-base font-semibold text-slate-600">
                  暂无数据
                </span>
              ) : (
                <div>{data.analytics.summaryCards.cartConversionRate}%</div>
              )}
              <ChangeHint
                current={data.analytics.summaryCards.cartConversionRate}
                previous={data.analytics.summaryCards.prevCartConversionRate}
                isRate
              />
            </MetricCard>
            <MetricCard label="报价下载次数">
              <div>{data.analytics.summaryCards.quoteDownloads}</div>
              <ChangeHint
                current={data.analytics.summaryCards.quoteDownloads}
                previous={data.analytics.summaryCards.prevQuoteDownloads}
              />
            </MetricCard>
          </div>
        )}
      </section>

      {/* Live inventory */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          当前库存
          <span className="ml-2 text-xs font-normal text-emerald-600">实时</span>
        </h2>
        {!data.inventory.available ? (
          <EmptyLine text={data.inventory.error || "该统计项暂无可用数据来源"} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <MetricCard label="车辆总数">{data.inventory.total}</MetricCard>
            <MetricCard label="在售车辆">{data.inventory.onSale}</MetricCard>
            <MetricCard label="草稿车辆">{data.inventory.draft}</MetricCard>
            <MetricCard label="已售车辆">{data.inventory.sold}</MetricCard>
            <MetricCard label="已下架车辆">{data.inventory.delisted}</MetricCard>
            <MetricCard label="推荐车辆">{data.inventory.featured}</MetricCard>
          </div>
        )}
      </section>

      {/* Period activity */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          经营活动（所选时间范围）
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {periodCards.map(({ key, label, metric, hint }) => (
            <MetricCard key={key} label={label} hint={hint}>
              {metric.available ? (
                metric.value
              ) : (
                <span className="text-base font-semibold text-slate-600">
                  {metric.message || "暂无数据来源"}
                </span>
              )}
            </MetricCard>
          ))}
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            车辆状态分布
          </h2>
          {!data.statusChart.available ? (
            <EmptyLine
              text={data.statusChart.error || "该统计项暂无可用数据来源"}
            />
          ) : (
            <StatusBarChart items={data.statusChart.items} />
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            新增车辆趋势
          </h2>
          {!data.vehicleTrend.available ? (
            <EmptyLine
              text={data.vehicleTrend.error || "该统计项暂无可用数据来源"}
            />
          ) : (
            <TrendChart buckets={data.vehicleTrend.buckets} />
          )}
        </section>
      </div>

      {/* Breakdowns */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          车辆结构分布
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <RankedList
            title="品牌分布"
            items={data.breakdowns.brand.items}
            available={data.breakdowns.brand.available}
            error={data.breakdowns.brand.error}
          />
          <RankedList
            title="车型类别分布"
            items={data.breakdowns.bodyType.items}
            available={data.breakdowns.bodyType.available}
            error={data.breakdowns.bodyType.error}
          />
          <RankedList
            title="年份分布"
            items={data.breakdowns.year.items}
            available={data.breakdowns.year.available}
            error={data.breakdowns.year.error}
          />
          <RankedList
            title="燃油类型分布"
            items={data.breakdowns.fuel.items}
            available={data.breakdowns.fuel.available}
            error={data.breakdowns.fuel.error}
          />
          <RankedList
            title="变速箱分布"
            items={data.breakdowns.transmission.items}
            available={data.breakdowns.transmission.available}
            error={data.breakdowns.transmission.error}
          />
        </div>
      </section>

      {/* Inventory value */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          库存价值概览
        </h2>
        {!data.inventoryValue.available ? (
          <EmptyLine
            text={data.inventoryValue.error || "该统计项暂无可用数据来源"}
          />
        ) : data.inventoryValue.vehicleCount === 0 ? (
          <EmptyLine text="暂无有效在售标价" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard
              label="在售车辆总标价"
              hint={`货币：${data.inventoryValue.currency}`}
            >
              {formatMoney(
                data.inventoryValue.totalListPrice,
                data.inventoryValue.currency
              )}
            </MetricCard>
            <MetricCard label="在售车辆平均标价">
              {formatMoney(
                data.inventoryValue.averageListPrice,
                data.inventoryValue.currency
              )}
            </MetricCard>
            <MetricCard label="最高标价">
              {formatMoney(
                data.inventoryValue.maxListPrice,
                data.inventoryValue.currency
              )}
            </MetricCard>
            <MetricCard label="最低标价">
              {formatMoney(
                data.inventoryValue.minListPrice,
                data.inventoryValue.currency
              )}
            </MetricCard>
          </div>
        )}
      </section>

      {/* Sales assignments */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold text-slate-900">
            销售分配统计
          </h2>
          {data.assignments.available && (
            <span className="text-xs font-medium rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
              分配是否均衡：{data.assignments.balanceLabel}
            </span>
          )}
        </div>
        {!data.assignments.available ? (
          <EmptyLine
            text={data.assignments.error || "该统计项暂无可用数据来源"}
          />
        ) : data.assignments.total === 0 ? (
          <EmptyLine text="所选时间范围内暂无数据" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-700">
                  <th className="py-2 pr-3 font-medium">姓名</th>
                  <th className="py-2 pr-3 font-medium">分配次数</th>
                  <th className="py-2 pr-3 font-medium">占比</th>
                  <th className="py-2 font-medium">最近分配时间</th>
                </tr>
              </thead>
              <tbody>
                {data.assignments.agents.map((agent) => (
                  <tr
                    key={agent.name}
                    className="border-b border-slate-100 text-slate-800"
                  >
                    <td className="py-2.5 pr-3 font-medium text-slate-700">{agent.name}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-800">{agent.count}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-800">
                      {agent.percent}%
                    </td>
                    <td className="py-2.5 text-slate-700">
                      {formatShanghai(agent.latestAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-600">
              基于现有 WhatsApp 分配记录统计，不展示电话号码，不改变分配逻辑。
            </p>
          </div>
        )}
      </section>

      {/* Activity */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          最近动态
        </h2>
        {!data.activity.available ? (
          <EmptyLine text={data.activity.error || "暂无可用动态记录"} />
        ) : (
          <ul className="space-y-3">
            {data.activity.items.map((item, idx) => (
              <li
                key={`${item.at}-${item.type}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b border-slate-50 pb-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    {item.type}
                  </p>
                  <p className="text-sm text-slate-700 break-words">
                    {item.description}
                  </p>
                </div>
                <p className="text-xs text-slate-600 flex-shrink-0 tabular-nums">
                  {formatShanghai(item.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* First-party website analytics */}
      {data.analytics?.available && !data.analytics.emptyWaiting && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                网站访问统计
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                页面浏览量 = page_view 次数；独立访客 = 匿名访客标识去重；访问会话
                = session 去重；平均页数 = 浏览量 ÷ 会话数
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              <MetricCard label="页面浏览量">
                {data.analytics.website.pageViews}
              </MetricCard>
              <MetricCard label="独立访客数" hint="匿名访客，非精确人数">
                {data.analytics.website.uniqueVisitors}
              </MetricCard>
              <MetricCard label="访问会话数">
                {data.analytics.website.sessions}
              </MetricCard>
              <MetricCard label="车辆详情浏览量">
                {data.analytics.website.vehicleDetailViews}
              </MetricCard>
              <MetricCard label="平均每次会话浏览页数">
                {data.analytics.website.pagesPerSession ?? "—"}
              </MetricCard>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              网站访问趋势
            </h2>
            <MultiTrendChart buckets={data.analytics.websiteTrend} />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
              <h2 className="text-base font-semibold text-slate-900 mb-3">
                热门页面
              </h2>
              {data.analytics.popularPages.length === 0 ? (
                <EmptyLine text="所选时间范围内暂无数据" />
              ) : (
                <ul className="space-y-2">
                  {data.analytics.popularPages.map((page) => (
                    <li
                      key={page.path}
                      className="flex items-center justify-between gap-3 text-sm border-b border-slate-50 pb-2 last:border-0"
                    >
                      <span className="font-medium text-slate-700 truncate min-w-0">
                        {page.path}
                      </span>
                      <span className="tabular-nums text-slate-800 flex-shrink-0 text-right">
                        {page.views} 次（{page.percent}%）
                        <span className="block text-[11px] text-slate-600">
                          {page.visitors} 匿名访客
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
              <h2 className="text-base font-semibold text-slate-900 mb-3">
                热门车辆
              </h2>
              {data.analytics.popularVehicles.length === 0 ? (
                <EmptyLine text="所选时间范围内暂无数据" />
              ) : (
                <ul className="space-y-3">
                  {data.analytics.popularVehicles.map((v) => (
                    <li
                      key={v.vehicleId}
                      className="flex gap-3 border-b border-slate-50 pb-3 last:border-0"
                    >
                      {v.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.coverUrl}
                          alt=""
                          className="h-14 w-20 rounded object-cover bg-slate-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-20 rounded bg-slate-100 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={`/admin/vehicles/${v.vehicleId}/edit`}
                          className="text-sm font-medium text-slate-700 hover:underline line-clamp-2"
                        >
                          {v.title}
                        </a>
                        <p className="text-xs text-slate-800 mt-1 tabular-nums">
                          详情 {v.detailViews} · WhatsApp {v.whatsappClicks} ·
                          报价 {v.quoteDownloads}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">转化漏斗</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-600">
                  来源：
                  <select
                    className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                    value={funnelSource}
                    disabled={state === "loading"}
                    onChange={(e) => {
                      const next = e.target.value as FunnelSource;
                      setFunnelSource(next);
                      void load(preset, customStart, customEnd, next, funnelDevice);
                    }}
                  >
                    <option value="all">全部来源</option>
                    <option value="facebook">Facebook</option>
                    <option value="google">Google</option>
                    <option value="direct">直接访问</option>
                    <option value="other">其他来源</option>
                    <option value="unknown">未知来源</option>
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  设备：
                  <select
                    className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                    value={funnelDevice}
                    disabled={state === "loading"}
                    onChange={(e) => {
                      const next = e.target.value as FunnelDevice;
                      setFunnelDevice(next);
                      void load(preset, customStart, customEnd, funnelSource, next);
                    }}
                  >
                    <option value="all">全部设备</option>
                    <option value="mobile">移动端</option>
                    <option value="desktop">电脑端</option>
                    <option value="tablet">平板</option>
                    <option value="other">其他</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              {/* Home */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    首页访客
                  </span>
                  <span className="tabular-nums text-slate-800 text-sm">
                    {funnel.homeVisitors}人
                  </span>
                  <span className="tabular-nums text-slate-700 text-sm">
                    100%
                  </span>
                </div>
              </div>
              <div className="flex justify-center text-slate-400">↓</div>

              {/* Vehicle Detail */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    车辆详情
                  </span>
                  <span className="tabular-nums text-slate-800 text-sm">
                    {funnel.vehicleDetailVisitors}人
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  较上一步 {formatPercent(funnel.fromPrev.vehicleDetail)} · 较首页{" "}
                  {formatPercent(funnel.fromHome.vehicleDetail)}
                </p>
              </div>
              <div className="flex justify-center text-slate-400">↓</div>

              {/* Cart Add */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    加入购物车
                  </span>
                  <span className="tabular-nums text-slate-800 text-sm">
                    {funnel.cartAddVisitors}人
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  较上一步 {formatPercent(funnel.fromPrev.cartAdd)} · 较首页{" "}
                  {formatPercent(funnel.fromHome.cartAdd)}
                </p>
              </div>
              <div className="flex justify-center text-slate-400">↓</div>

              {/* WhatsApp Click */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    WhatsApp 点击
                  </span>
                  <span className="tabular-nums text-slate-800 text-sm">
                    {funnel.whatsappClickVisitors}人
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  较上一步 {formatPercent(funnel.fromPrev.whatsappClick)} · 较首页{" "}
                  {formatPercent(funnel.fromHome.whatsappClick)}
                </p>
              </div>
            </div>
          </section>

          <VehicleHeatSection
            data={data.vehicleHeat}
            range={{
              preset: data.range.preset,
              startLabel: data.range.startLabel,
              endLabel: data.range.endLabel,
            }}
          />

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                WhatsApp 点击统计
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                仅统计用户主动点击打开 WhatsApp，不代表成交；不存储电话号码。
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <MetricCard label="WhatsApp 总点击量">
                {data.analytics.whatsapp.totalClicks}
              </MetricCard>
              <MetricCard label="独立点击访客数">
                {data.analytics.whatsapp.uniqueVisitors}
              </MetricCard>
              <MetricCard label="车辆详情咨询点击">
                {data.analytics.whatsapp.vehicleDetail}
              </MetricCard>
              <MetricCard label="购物车结算点击">
                {data.analytics.whatsapp.cartCheckout}
              </MetricCard>
              <MetricCard label="悬浮按钮点击">
                {data.analytics.whatsapp.floatingButton}
              </MetricCard>
              <MetricCard label="联系页面点击">
                {data.analytics.whatsapp.contactPage}
              </MetricCard>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  点击来源分布
                </h3>
                {data.analytics.whatsapp.bySource.length === 0 ? (
                  <EmptyLine text="所选时间范围内暂无数据" />
                ) : (
                  <ul className="space-y-2">
                    {data.analytics.whatsapp.bySource.map((row) => (
                      <li
                        key={row.source}
                        className="flex justify-between gap-2 text-sm border-b border-slate-50 pb-2"
                      >
                        <span className="font-medium text-slate-700">{sourceLabel(row.source)}</span>
                        <span className="tabular-nums text-slate-800">
                          {row.count}（{row.percent}%）
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  销售联系人分配点击
                </h3>
                <p className="text-[11px] text-slate-600 mb-2">
                  点击归因，非销售业绩
                </p>
                {data.analytics.whatsapp.byContact.length === 0 ? (
                  <EmptyLine text="所选时间范围内暂无数据" />
                ) : (
                  <ul className="space-y-2">
                    {data.analytics.whatsapp.byContact.map((row) => (
                      <li
                        key={row.name}
                        className="flex justify-between gap-2 text-sm border-b border-slate-50 pb-2"
                      >
                        <span className="font-medium text-slate-700">{row.name}</span>
                        <span className="tabular-nums text-slate-800">
                          {row.count}（{row.percent}%）
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                购物车转化统计
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                购物车转化率 = 发起 WhatsApp 结算的访客数 ÷ 加入购物车的访客数
              </p>
            </div>
            {data.analytics.cart.addVisitors === 0 ? (
              <EmptyLine text="所选时间范围内暂无购物车转化数据" />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <MetricCard label="加入购物车次数">
                    {data.analytics.cart.addCount}
                  </MetricCard>
                  <MetricCard label="进入购物车人数">
                    {data.analytics.cart.viewVisitors}
                  </MetricCard>
                  <MetricCard label="发起 WhatsApp 结算人数">
                    {data.analytics.cart.checkoutVisitors}
                  </MetricCard>
                  <MetricCard label="购物车转化率">
                    {data.analytics.cart.conversionRate == null
                      ? "—"
                      : `${data.analytics.cart.conversionRate}%`}
                  </MetricCard>
                  <MetricCard label="平均购物车车辆数">
                    {data.analytics.cart.avgCartItems ?? "—"}
                  </MetricCard>
                  <MetricCard label="平均购物车车辆金额">
                    {data.analytics.cart.avgCartValue == null
                      ? "—"
                      : formatMoney(data.analytics.cart.avgCartValue, "USD")}
                  </MetricCard>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    转化漏斗（匿名访客）
                  </h3>
                  <div className="space-y-2">
                    {data.analytics.cart.funnel.map((step, idx) => {
                      const max = Math.max(
                        ...data.analytics.cart.funnel.map((f) => f.visitors),
                        1
                      );
                      return (
                        <div key={step.stage} className="min-w-0">
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-700">
                              {idx + 1}. {step.stage}
                            </span>
                            <span className="tabular-nums text-slate-800">
                              {step.visitors}
                            </span>
                          </div>
                          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#1E293B]"
                              style={{
                                width: `${Math.max(
                                  (step.visitors / max) * 100,
                                  step.visitors > 0 ? 4 : 0
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                报价下载统计
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                仅统计成功下载；不代表成交，不存储 PDF 内容或客户隐私。
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="报价下载总次数">
                {data.analytics.quotes.downloads}
              </MetricCard>
              <MetricCard label="独立下载访客数">
                {data.analytics.quotes.uniqueVisitors}
              </MetricCard>
              <MetricCard label="下载报价的车辆数量">
                {data.analytics.quotes.vehicleCount}
              </MetricCard>
              <MetricCard label="平均每辆车下载次数">
                {data.analytics.quotes.avgPerVehicle ?? "—"}
              </MetricCard>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                报价下载趋势
              </h3>
              <TrendChart buckets={data.analytics.quotes.trend} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                下载最多的车辆
              </h3>
              {data.analytics.quotes.topVehicles.length === 0 ? (
                <EmptyLine text="所选时间范围内暂无数据" />
              ) : (
                <ul className="space-y-2">
                  {data.analytics.quotes.topVehicles.map((v) => (
                    <li
                      key={v.vehicleId}
                      className="flex justify-between gap-3 text-sm border-b border-slate-50 pb-2"
                    >
                      <a
                        href={`/admin/vehicles/${v.vehicleId}/edit`}
                        className="font-medium text-slate-700 hover:underline truncate min-w-0"
                      >
                        {v.title}
                      </a>
                      <span className="tabular-nums text-slate-800 flex-shrink-0">
                        {v.downloads}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {data.analytics?.available && data.analytics.emptyWaiting && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          统计功能已启用，等待新的访问数据。历史指标自部署日起开始累积，不含虚构回填。
        </section>
      )}

      {/* Not enabled */}
      {data.notEnabled.length > 0 && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            尚未启用的数据统计
          </h2>
          <ul className="space-y-1.5 text-sm text-slate-600">
            {data.notEnabled.map((item) => (
              <li key={item.name}>
                <span className="font-medium text-slate-700">{item.name}</span>
                {" — "}
                {item.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Diagnostics */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setSourcesOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800"
        >
          数据来源状态
          <span className="text-slate-600 font-normal">
            {sourcesOpen ? "收起" : "展开"}
          </span>
        </button>
        {sourcesOpen && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-2">
            <p className="text-[11px] text-slate-600 pb-1">
              第一方匿名分析：不存储客户电话/邮箱、不展示完整 IP、不做侵入式指纹识别。
            </p>
            {data.sources.map((src) => (
              <div
                key={src.id}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 text-sm border-b border-slate-50 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-700">{src.name}</p>
                  <p className="text-xs text-slate-600">{src.detail}</p>
                  {(src.totalEvents != null || src.periodEvents != null) && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {src.totalEvents != null && `总事件 ${src.totalEvents}`}
                      {src.totalEvents != null &&
                        src.periodEvents != null &&
                        " · "}
                      {src.periodEvents != null &&
                        `所选范围 ${src.periodEvents}`}
                      {src.latestEventAt &&
                        ` · 最近 ${formatShanghai(src.latestEventAt)}`}
                    </p>
                  )}
                  {src.error && (
                    <p className="text-xs text-amber-700 mt-0.5">{src.error}</p>
                  )}
                </div>
                <div className="text-xs text-right flex-shrink-0">
                  <span
                    className={
                      src.available
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-600 font-semibold"
                    }
                  >
                    {src.available ? "可用" : "暂不可用"}
                  </span>
                  {src.lastLoadedAt && (
                    <p className="text-slate-600 mt-0.5">
                      {src.lastLoadedAt}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
