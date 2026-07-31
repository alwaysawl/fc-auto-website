"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  StatisticsPayload,
  StatisticsRangePreset,
} from "@/lib/admin/statistics-types";

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
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1.5 text-2xl font-bold text-[#1E293B] break-words">
        {children}
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-slate-500 py-2">{text}</p>;
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
            <span className="font-medium text-[#1E293B]">{item.label}</span>
            <span className="tabular-nums text-slate-600">{item.count}</span>
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
      <ul className="flex flex-wrap gap-3 pt-1 text-xs text-slate-500">
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
            <span className="text-[10px] tabular-nums text-slate-500">
              {b.count > 0 ? b.count : ""}
            </span>
            <div
              className="w-full rounded-t-sm bg-[#FACC15] min-h-[2px]"
              style={{ height: `${Math.max((b.count / max) * 110, b.count > 0 ? 6 : 2)}px` }}
              title={`${b.label}: ${b.count}`}
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
      <h3 className="text-sm font-semibold text-[#1E293B] mb-3">{title}</h3>
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
              <span className="font-medium text-[#1E293B] truncate min-w-0">
                {item.name}
              </span>
              <span className="tabular-nums text-slate-600 flex-shrink-0">
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
  const [preset, setPreset] = useState<StatisticsRangePreset>(
    initial.range.preset
  );
  const [customStart, setCustomStart] = useState(initial.range.startLabel);
  const [customEnd, setCustomEnd] = useState(initial.range.endLabel);
  const [data, setData] = useState<StatisticsPayload>(initial);
  const [state, setState] = useState<LoadState>("ready");
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const load = useCallback(
    async (nextPreset: StatisticsRangePreset, start: string, end: string) => {
      setState("loading");
      try {
        const params = new URLSearchParams({ preset: nextPreset });
        if (nextPreset === "custom") {
          params.set("start", start);
          params.set("end", end);
        }
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
          <h1 className="text-2xl font-bold text-[#1E293B]">数据统计</h1>
          <p className="text-sm text-slate-500 mt-1">
            查看车辆、询盘、报价与销售分配的真实经营数据。
          </p>
          <p className="text-xs text-slate-400 mt-1">
            时区：{data.timezone} · 范围 {data.range.startLabel} ~{" "}
            {data.range.endLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={state === "loading"}
            onClick={() => void load(preset, customStart, customEnd)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1E293B] hover:bg-slate-50 disabled:opacity-50"
          >
            {state === "loading" ? "刷新中…" : "刷新数据"}
          </button>
          <span className="text-xs text-slate-500">
            上次更新：{formatShanghai(data.generatedAt)}
          </span>
        </div>
      </div>

      {/* Date filter */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-[#1E293B]">时间范围</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPreset(p.id);
                if (p.id !== "custom") {
                  void load(p.id, customStart, customEnd);
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
              onClick={() => void load("custom", customStart, customEnd)}
              className="rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-[#1E293B] hover:brightness-95"
            >
              应用
            </button>
          </div>
        )}
        <p className="text-xs text-slate-400">
          时间筛选仅作用于经营活动指标；库存状态卡片始终显示当前实时库存。
        </p>
      </section>

      {state === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          数据加载失败，请稍后重试
        </div>
      )}

      {/* Live inventory */}
      <section>
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
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
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
          经营活动（所选时间范围）
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {periodCards.map(({ key, label, metric, hint }) => (
            <MetricCard key={key} label={label} hint={hint}>
              {metric.available ? (
                metric.value
              ) : (
                <span className="text-base font-semibold text-slate-500">
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
          <h2 className="text-base font-semibold text-[#1E293B] mb-3">
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
          <h2 className="text-base font-semibold text-[#1E293B] mb-3">
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
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
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
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
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
          <h2 className="text-base font-semibold text-[#1E293B]">
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
                <tr className="border-b border-slate-200 text-left text-slate-500">
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
                    className="border-b border-slate-100 text-[#1E293B]"
                  >
                    <td className="py-2.5 pr-3 font-medium">{agent.name}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{agent.count}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {agent.percent}%
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {formatShanghai(agent.latestAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-400">
              基于现有 WhatsApp 分配记录统计，不展示电话号码，不改变分配逻辑。
            </p>
          </div>
        )}
      </section>

      {/* Activity */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
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
                  <p className="text-xs font-semibold text-slate-500">
                    {item.type}
                  </p>
                  <p className="text-sm text-[#1E293B] break-words">
                    {item.description}
                  </p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                  {formatShanghai(item.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Not enabled */}
      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-2">
          尚未启用的数据统计
        </h2>
        <ul className="space-y-1.5 text-sm text-slate-600">
          {data.notEnabled.map((item) => (
            <li key={item.name}>
              <span className="font-medium text-[#1E293B]">{item.name}</span>
              {" — "}
              {item.reason}
            </li>
          ))}
        </ul>
      </section>

      {/* Diagnostics */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setSourcesOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#1E293B]"
        >
          数据来源状态
          <span className="text-slate-400 font-normal">
            {sourcesOpen ? "收起" : "展开"}
          </span>
        </button>
        {sourcesOpen && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-2">
            {data.sources.map((src) => (
              <div
                key={src.id}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 text-sm border-b border-slate-50 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#1E293B]">{src.name}</p>
                  <p className="text-xs text-slate-500">{src.detail}</p>
                  {src.error && (
                    <p className="text-xs text-amber-700 mt-0.5">{src.error}</p>
                  )}
                </div>
                <div className="text-xs text-right flex-shrink-0">
                  <span
                    className={
                      src.available
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-500 font-semibold"
                    }
                  >
                    {src.available ? "可用" : "暂不可用"}
                  </span>
                  {src.lastLoadedAt && (
                    <p className="text-slate-400 mt-0.5">
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
