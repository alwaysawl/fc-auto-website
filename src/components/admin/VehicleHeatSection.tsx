"use client";

import { useMemo, useState } from "react";
import type {
  StatisticsRangePreset,
  VehicleHeatDashboard,
  VehicleHeatRow,
  VehicleHeatSort,
  VehicleHeatStatusFilter,
  VehicleHeatTrendPoint,
} from "@/lib/admin/statistics-types";

const fieldCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100";

function sortRows(rows: VehicleHeatRow[], sort: VehicleHeatSort): VehicleHeatRow[] {
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
      default:
        return b.heatScore - a.heatScore || b.detailViews - a.detailViews;
    }
  });
  return copy;
}

function filterRows(
  rows: VehicleHeatRow[],
  status: VehicleHeatStatusFilter
): VehicleHeatRow[] {
  return rows.filter((r) => {
    if (status === "all") return true;
    if (r.missing) return false;
    const s = r.status ?? "在售";
    if (status === "on_sale") return s === "在售";
    if (status === "sold") return s === "已售";
    if (status === "delisted") return s === "已下架";
    return true;
  });
}

function statusTextClass(status: string | null | undefined): string {
  switch (status) {
    case "在售":
      return "text-emerald-800";
    case "已售":
      return "text-slate-700";
    case "草稿":
      return "text-amber-800";
    case "已下架":
      return "text-red-700";
    default:
      return "text-slate-800";
  }
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    vehicle_detail: "车辆详情",
    vehicle_card: "车辆卡片",
    cart_checkout: "购物车结算",
    quotation: "报价相关",
    inventory: "库存列表",
    home: "首页",
    other: "其他",
  };
  return map[source] ?? source;
}

function LeaderCard({
  label,
  row,
}: {
  label: string;
  row: VehicleHeatRow | null;
}) {
  if (!row) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        <p className="mt-2 text-sm text-slate-600">所选时间范围内暂无车辆互动数据</p>
      </div>
    );
  }
  const count =
    label.includes("浏览")
      ? row.detailViews
      : label.includes("WhatsApp")
        ? row.whatsappClicks
        : label.includes("购物车")
          ? row.cartAdds
          : row.quoteDownloads;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex gap-3">
        {row.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.coverUrl}
            alt=""
            className="h-14 w-20 rounded object-cover bg-slate-100 flex-shrink-0"
          />
        ) : (
          <div className="h-14 w-20 rounded bg-slate-100 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700 line-clamp-2">
            {row.title}
          </p>
          <p className="text-lg font-bold text-slate-800 tabular-nums mt-0.5">
            {count}
          </p>
          <p className="text-[11px] text-slate-700">
            {row.status || "—"} · {row.priceLabel || "价格未填"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniBars({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <div className="mb-0.5 flex justify-between text-xs">
            <span className="text-slate-700 truncate">{item.label}</span>
            <span className="tabular-nums text-slate-800 font-semibold">
              {item.value}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1E293B]"
              style={{
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VehicleHeatSection({
  data,
  range,
}: {
  data: VehicleHeatDashboard | null | undefined;
  range: {
    preset: StatisticsRangePreset;
    startLabel: string;
    endLabel: string;
  };
}) {
  const [statusFilter, setStatusFilter] =
    useState<VehicleHeatStatusFilter>("on_sale");
  const [sort, setSort] = useState<VehicleHeatSort>("heat");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [trend, setTrend] = useState<VehicleHeatTrendPoint[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const ranking = useMemo(() => {
    if (!data?.ranking) return [];
    return sortRows(filterRows(data.ranking, statusFilter), sort);
  }, [data, statusFilter, sort]);

  const leaders = useMemo(() => {
    const base = filterRows(data?.ranking ?? [], statusFilter);
    const pick = (sorted: VehicleHeatRow[], pred: (r: VehicleHeatRow) => boolean) =>
      sorted.find(pred) ?? null;
    return {
      mostViews: pick(sortRows(base, "views"), (r) => r.detailViews > 0),
      mostWhatsapp: pick(sortRows(base, "whatsapp"), (r) => r.whatsappClicks > 0),
      mostCart: pick(sortRows(base, "cart"), (r) => r.cartAdds > 0),
      mostQuotes: pick(sortRows(base, "quotes"), (r) => r.quoteDownloads > 0),
    };
  }, [data, statusFilter]);

  async function openDetail(vehicleId: string) {
    setSelectedId(vehicleId);
    setDetailLoading(true);
    setDetailError(null);
    setTrend([]);
    try {
      const params = new URLSearchParams({
        vehicleId,
        preset: range.preset,
      });
      if (range.preset === "custom") {
        params.set("start", range.startLabel);
        params.set("end", range.endLabel);
      }
      const res = await fetch(`/api/admin/statistics/vehicle-heat?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailError(json.error || "车辆热度数据加载失败，请稍后重试");
        return;
      }
      setTrend(json.trend || []);
    } catch {
      setDetailError("车辆热度数据加载失败，请稍后重试");
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const compareRows = ranking.filter((r) => compareIds.includes(r.vehicleId));
  const selected = ranking.find((r) => r.vehicleId === selectedId) ?? null;

  if (!data) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">车辆热度分析</h2>
        <p className="text-sm text-slate-600 mt-2">车辆热度数据加载失败，请稍后重试</p>
      </section>
    );
  }

  if (!data.available) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">车辆热度分析</h2>
        <p className="text-sm text-slate-600 mt-2">
          {data.error || "车辆热度数据加载失败，请稍后重试"}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">车辆热度分析</h2>
        <p className="text-sm text-slate-600 mt-1">
          查看哪些车辆最受关注，以及哪些车辆带来更多 WhatsApp 咨询。
        </p>
        <p className="text-xs text-slate-600 mt-1">
          WhatsApp 咨询率 = 点击该车辆 WhatsApp 的访客数 ÷ 浏览该车辆的访客数 ·
          互动热度仅用于帮助排序，不代表最终成交结果。
        </p>
      </div>

      {data.empty ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          所选时间范围内暂无车辆互动数据
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <LeaderCard label="浏览量最高车辆" row={leaders.mostViews} />
            <LeaderCard label="WhatsApp 咨询最多车辆" row={leaders.mostWhatsapp} />
            <LeaderCard label="加入购物车最多车辆" row={leaders.mostCart} />
            <LeaderCard label="报价下载最多车辆" row={leaders.mostQuotes} />
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <label className="block text-sm">
              <span className="text-slate-600">状态筛选</span>
              <select
                className={`${fieldCls} mt-1 block`}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as VehicleHeatStatusFilter)
                }
              >
                <option value="on_sale">仅在售</option>
                <option value="all">全部状态</option>
                <option value="sold">已售</option>
                <option value="delisted">已下架</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">排序</span>
              <select
                className={`${fieldCls} mt-1 block`}
                value={sort}
                onChange={(e) => setSort(e.target.value as VehicleHeatSort)}
              >
                <option value="heat">综合热度（互动热度参考）</option>
                <option value="views">浏览量最高</option>
                <option value="whatsapp">WhatsApp 点击最多</option>
                <option value="cart">购物车添加最多</option>
                <option value="quotes">报价下载最多</option>
                <option value="rate_high">WhatsApp 咨询率最高</option>
                <option value="rate_low">WhatsApp 咨询率最低</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">车辆热度排行</h3>
            </div>
            {ranking.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-600 text-center">
                所选时间范围内暂无车辆互动数据
              </p>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full min-w-[64rem] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-700">
                        {[
                          "排名",
                          "车辆",
                          "状态",
                          "详情浏览量",
                          "独立浏览访客",
                          "WhatsApp 点击",
                          "加入购物车",
                          "报价下载",
                          "WhatsApp 咨询率",
                          "操作",
                        ].map((h) => (
                          <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.slice(0, 40).map((row, idx) => (
                        <tr
                          key={row.vehicleId}
                          className="border-b border-slate-50 hover:bg-slate-50"
                        >
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-2 items-center min-w-0">
                              {row.coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={row.coverUrl}
                                  alt=""
                                  className="h-10 w-14 rounded object-cover bg-slate-100"
                                />
                              ) : (
                                <div className="h-10 w-14 rounded bg-slate-100" />
                              )}
                              <button
                                type="button"
                                className="text-left font-medium text-slate-800 hover:underline line-clamp-2"
                                onClick={() => void openDetail(row.vehicleId)}
                              >
                                {row.title}
                              </button>
                            </div>
                          </td>
                          <td className={`px-3 py-2.5 ${statusTextClass(row.status)}`}>
                            {row.status || "—"}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.detailViews}</td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.uniqueViewers}</td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.whatsappClicks}</td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.cartAdds}</td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.quoteDownloads}</td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">
                            {row.inquiryRate == null ? "暂无数据" : `${row.inquiryRate}%`}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`/admin/vehicles/${row.vehicleId}/edit`}
                                className="text-xs font-semibold underline text-slate-800"
                              >
                                查看车辆
                              </a>
                              <a
                                href={`/en/inventory/${row.vehicleId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium underline text-slate-700"
                              >
                                网站
                              </a>
                              <button
                                type="button"
                                className="text-xs font-medium underline text-slate-700"
                                onClick={() => toggleCompare(row.vehicleId)}
                              >
                                {compareIds.includes(row.vehicleId)
                                  ? "取消对比"
                                  : "加入对比"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="lg:hidden divide-y divide-slate-100">
                  {ranking.slice(0, 40).map((row, idx) => (
                    <li key={row.vehicleId} className="p-4 space-y-2">
                      <div className="flex gap-3">
                        {row.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.coverUrl}
                            alt=""
                            className="h-16 w-24 rounded object-cover bg-slate-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-16 w-24 rounded bg-slate-100 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-slate-800">#{idx + 1}</p>
                          <button
                            type="button"
                            className="text-sm font-semibold text-slate-800 text-left hover:underline"
                            onClick={() => void openDetail(row.vehicleId)}
                          >
                            {row.title}
                          </button>
                          <p className="text-xs mt-0.5">
                            <span className={statusTextClass(row.status)}>
                              {row.status || "—"}
                            </span>
                            <span className="text-slate-800">
                              {" "}
                              · {row.priceLabel || "价格未填"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 tabular-nums">
                        浏览 {row.detailViews} · 访客 {row.uniqueViewers} · WA{" "}
                        {row.whatsappClicks} · 购物车 {row.cartAdds} · 报价{" "}
                        {row.quoteDownloads} · 咨询率{" "}
                        {row.inquiryRate == null ? "暂无数据" : `${row.inquiryRate}%`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/admin/vehicles/${row.vehicleId}/edit`}
                          className="rounded-md bg-[#1E293B] px-2.5 py-1.5 text-xs font-semibold text-[#FACC15]"
                        >
                          查看车辆
                        </a>
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-800"
                          onClick={() => toggleCompare(row.vehicleId)}
                        >
                          {compareIds.includes(row.vehicleId) ? "取消对比" : "对比"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Detail drawer-like panel */}
          {selectedId && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  车辆互动详情
                  {selected ? ` · ${selected.title}` : ""}
                </h3>
                <button
                  type="button"
                  className="text-xs font-medium text-slate-700"
                  onClick={() => setSelectedId(null)}
                >
                  关闭
                </button>
              </div>
              {detailLoading && (
                <p className="text-sm text-slate-600">加载中…</p>
              )}
              {detailError && (
                <p className="text-sm text-red-700">{detailError}</p>
              )}
              {selected && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-lg font-bold tabular-nums text-slate-800">{selected.detailViews}</p>
                      <p className="text-[11px] text-slate-700">详情浏览</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-lg font-bold tabular-nums text-slate-800">{selected.uniqueViewers}</p>
                      <p className="text-[11px] text-slate-700">独立访客</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-lg font-bold tabular-nums text-slate-800">{selected.whatsappClicks}</p>
                      <p className="text-[11px] text-slate-700">WhatsApp</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-lg font-bold tabular-nums text-slate-800">
                        {selected.inquiryRate == null
                          ? "暂无数据"
                          : `${selected.inquiryRate}%`}
                      </p>
                      <p className="text-[11px] text-slate-700">咨询率</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 mb-2">
                      点击来源
                    </h4>
                    {selected.waSources.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        所选时间范围内暂无车辆 WhatsApp 咨询点击
                      </p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {selected.waSources.map((s) => (
                          <li
                            key={s.source}
                            className="flex justify-between border-b border-slate-50 pb-1"
                          >
                            <span className="text-slate-700">{sourceLabel(s.source)}</span>
                            <span className="tabular-nums text-slate-800">{s.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {trend.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 mb-2">
                        所选时段趋势
                      </h4>
                      <MiniBars
                        items={trend.map((t) => ({
                          label: t.label,
                          value: t.views + t.whatsappClicks,
                        }))}
                      />
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[28rem] text-xs">
                          <thead>
                            <tr className="text-slate-700 border-b">
                              <th className="py-1 text-left font-medium">日期</th>
                              <th className="py-1 text-right font-medium">浏览</th>
                              <th className="py-1 text-right font-medium">访客</th>
                              <th className="py-1 text-right font-medium">WA</th>
                              <th className="py-1 text-right font-medium">购物车</th>
                              <th className="py-1 text-right font-medium">报价</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trend.map((t) => (
                              <tr key={t.key} className="border-b border-slate-50 text-slate-800">
                                <td className="py-1 text-slate-700">{t.label}</td>
                                <td className="py-1 text-right tabular-nums">{t.views}</td>
                                <td className="py-1 text-right tabular-nums">
                                  {t.uniqueVisitors}
                                </td>
                                <td className="py-1 text-right tabular-nums">
                                  {t.whatsappClicks}
                                </td>
                                <td className="py-1 text-right tabular-nums">
                                  {t.cartAdds}
                                </td>
                                <td className="py-1 text-right tabular-nums">
                                  {t.quoteDownloads}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Comparison */}
          {compareRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                对比车辆（最多 3 辆）
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-700">
                      <th className="py-2 pr-2 font-medium">指标</th>
                      {compareRows.map((r) => (
                        <th key={r.vehicleId} className="py-2 pr-2 font-medium max-w-[8rem] truncate">
                          {r.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["详情浏览量", "detailViews"],
                        ["独立浏览访客", "uniqueViewers"],
                        ["WhatsApp 点击", "whatsappClicks"],
                        ["加入购物车", "cartAdds"],
                        ["报价下载", "quoteDownloads"],
                      ] as const
                    ).map(([label, key]) => (
                      <tr key={label} className="border-b border-slate-50">
                        <td className="py-2 pr-2 text-slate-700">{label}</td>
                        {compareRows.map((r) => (
                          <td
                            key={r.vehicleId}
                            className="py-2 pr-2 tabular-nums font-semibold text-slate-800"
                          >
                            {r[key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-b border-slate-50">
                      <td className="py-2 pr-2 text-slate-700">咨询率</td>
                      {compareRows.map((r) => (
                        <td
                          key={r.vehicleId}
                          className="py-2 pr-2 tabular-nums font-semibold text-slate-800"
                        >
                          {r.inquiryRate == null ? "暂无数据" : `${r.inquiryRate}%`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <MiniBars
                items={compareRows.map((r) => ({
                  label: r.title.slice(0, 18),
                  value: r.heatScore,
                }))}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">
                高浏览低咨询车辆
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                这些车辆受到关注，但客户进一步咨询较少，可检查价格、图片、描述或车型匹配度。
              </p>
              {data.sampleNote && data.highViewLowInquiry.length === 0 ? (
                <p className="text-sm text-slate-600">{data.sampleNote}</p>
              ) : data.highViewLowInquiry.length === 0 ? (
                <p className="text-sm text-slate-600">样本较少，暂不判断</p>
              ) : (
                <ul className="space-y-3">
                  {data.highViewLowInquiry.map((r) => (
                    <li key={r.vehicleId} className="flex gap-3 border-b border-slate-50 pb-2">
                      {r.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.coverUrl}
                          alt=""
                          className="h-12 w-16 rounded object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded bg-slate-100" />
                      )}
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-slate-700 line-clamp-2">
                          {r.title}
                        </p>
                        <p className="text-xs text-slate-800 tabular-nums mt-0.5">
                          访客 {r.uniqueViewers} · WA {r.whatsappClicks} · 咨询率{" "}
                          {r.inquiryRate ?? "暂无数据"}
                          {r.inquiryRate != null ? "%" : ""} ·{" "}
                          {r.priceLabel || "价格未填"} · {r.status || "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">
                低浏览高咨询车辆
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                这些车辆访问量不高，但咨询意愿较强，可以考虑增加曝光。
              </p>
              {data.sampleNote && data.lowViewHighInquiry.length === 0 ? (
                <p className="text-sm text-slate-600">{data.sampleNote}</p>
              ) : data.lowViewHighInquiry.length === 0 ? (
                <p className="text-sm text-slate-600">样本较少，暂不判断</p>
              ) : (
                <ul className="space-y-3">
                  {data.lowViewHighInquiry.map((r) => (
                    <li key={r.vehicleId} className="flex gap-3 border-b border-slate-50 pb-2">
                      {r.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.coverUrl}
                          alt=""
                          className="h-12 w-16 rounded object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded bg-slate-100" />
                      )}
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-slate-700 line-clamp-2">
                          {r.title}
                        </p>
                        <p className="text-xs text-slate-800 tabular-nums mt-0.5">
                          访客 {r.uniqueViewers} · WA {r.whatsappClicks} · 咨询率{" "}
                          {r.inquiryRate ?? "暂无数据"}
                          {r.inquiryRate != null ? "%" : ""} · 购物车 {r.cartAdds}{" "}
                          · 报价 {r.quoteDownloads}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
