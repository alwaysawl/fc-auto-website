"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  INQUIRY_PRIORITIES,
  INQUIRY_PRIORITY_LABELS,
  INQUIRY_SOURCES,
  INQUIRY_SOURCE_LABELS,
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  type InquiryListItem,
  type InquiryListResult,
  type InquirySort,
} from "@/lib/admin/inquiries/types";

const fieldCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/50";

type Filters = {
  q: string;
  status: string;
  priority: string;
  assigned: string;
  source: string;
  country: string;
  followUp: string;
  sort: InquirySort;
  archived: boolean;
  page: number;
};

const defaultFilters: Filters = {
  q: "",
  status: "",
  priority: "",
  assigned: "",
  source: "",
  country: "",
  followUp: "",
  sort: "attention",
  archived: false,
  page: 1,
};

function formatShanghai(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function statusBadge(status: InquiryListItem["status"]) {
  const label = INQUIRY_STATUS_LABELS[status];
  const tone =
    status === "won"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "lost" || status === "invalid"
        ? "bg-slate-100 text-slate-600 border-slate-200"
        : status === "interested" || status === "negotiating"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : "bg-sky-50 text-sky-800 border-sky-200";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function priorityBadge(priority: InquiryListItem["priority"]) {
  const tone =
    priority === "high"
      ? "text-red-700 bg-red-50 border-red-200"
      : priority === "low"
        ? "text-slate-600 bg-slate-50 border-slate-200"
        : "text-amber-800 bg-amber-50 border-amber-200";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {INQUIRY_PRIORITY_LABELS[priority]}
    </span>
  );
}

export default function AdminInquiriesClient({
  initial,
}: {
  initial: InquiryListResult;
}) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.error);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q.trim()) p.set("q", filters.q.trim());
    if (filters.status) p.set("status", filters.status);
    if (filters.priority) p.set("priority", filters.priority);
    if (filters.assigned) p.set("assigned", filters.assigned);
    if (filters.source) p.set("source", filters.source);
    if (filters.country.trim()) p.set("country", filters.country.trim());
    if (filters.followUp) p.set("followUp", filters.followUp);
    if (filters.archived) p.set("archived", "1");
    p.set("sort", filters.sort);
    p.set("page", String(filters.page));
    p.set("pageSize", "20");
    return p.toString();
  }, [filters]);

  const load = useCallback(async (qs: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inquiries?${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "询盘加载失败，请稍后重试");
        return;
      }
      setData(json as InquiryListResult);
      if (json.error) setError(json.error);
    } catch {
      setError("询盘加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(queryString);
  }, [queryString, load]);

  function applySummaryFilter(key: string) {
    setFilters((f) => {
      const next = { ...f, page: 1 };
      if (key === "new") next.status = "new";
      else if (key === "interested") next.status = "interested";
      else if (key === "quoting") next.status = "quoting";
      else if (key === "negotiating") next.status = "negotiating";
      else if (key === "won") next.status = "won";
      else if (key === "lost") next.status = "lost";
      else if (key === "today") {
        next.followUp = "today";
        next.status = "";
      } else if (key === "overdue") {
        next.followUp = "overdue";
        next.status = "";
      } else if (key === "next7") {
        next.followUp = "next_7_days";
        next.status = "";
      } else if (key === "unset") {
        next.followUp = "unset";
        next.status = "";
      }
      return next;
    });
  }

  async function quickStatus(id: string, status: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    let lostReason: string | undefined;
    if (status === "lost" || status === "invalid") {
      lostReason = window.prompt("请填写流失或无效原因") || undefined;
      if (!lostReason) return;
    }
    setActionMsg(null);
    try {
      const body: Record<string, unknown> = { status };
      if (lostReason) body.lostReason = lostReason;
      if (status === "contacted") {
        body.lastContactedAt = new Date().toISOString();
      }
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMsg(json.error || "操作失败");
        return;
      }
      setActionMsg(json.message || "询盘保存成功");
      void load(queryString);
    } catch {
      setActionMsg("操作失败，请稍后重试");
    }
  }

  async function setFollowUp(id: string) {
    const raw = window.prompt(
      "下次跟进时间（例如 2026-08-01 10:00）",
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ")
    );
    if (!raw) return;
    const parsed = Date.parse(raw.replace(" ", "T"));
    if (!Number.isFinite(parsed)) {
      setActionMsg("时间格式无效");
      return;
    }
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUpAt: new Date(parsed).toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMsg(json.error || "操作失败");
        return;
      }
      setActionMsg("跟进时间已更新");
      void load(queryString);
    } catch {
      setActionMsg("操作失败，请稍后重试");
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const summaryCards = [
    { key: "new", label: "新询盘", value: data.summary.newCount },
    { key: "today", label: "今日需跟进", value: data.summary.todayFollowUp },
    { key: "overdue", label: "已逾期", value: data.summary.overdue },
    { key: "interested", label: "有意向", value: data.summary.interested },
    { key: "quoting", label: "报价中", value: data.summary.quoting },
    { key: "negotiating", label: "谈判中", value: data.summary.negotiating },
    { key: "won", label: "已成交", value: data.summary.won },
    { key: "lost", label: "已流失", value: data.summary.lost },
  ];

  const funnel = [
    { label: "新询盘", value: data.funnel.newCount },
    { label: "已联系", value: data.funnel.contacted },
    { label: "有意向", value: data.funnel.interested },
    { label: "报价中", value: data.funnel.quoting },
    { label: "谈判中", value: data.funnel.negotiating },
    { label: "已成交", value: data.funnel.won },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <div className="space-y-5 max-w-7xl min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">询盘管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            跟进客户意向，优先处理高意向与逾期询盘。负责人：Shawn / Miles。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/inquiries/new"
            className="inline-flex items-center rounded-lg bg-[#FACC15] px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:brightness-95"
          >
            新增询盘
          </Link>
          <button
            type="button"
            onClick={() => {
              const url = `/api/admin/inquiries/export?${queryString}`;
              window.open(url, "_blank");
            }}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1E293B] hover:bg-slate-50"
          >
            导出 CSV
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("导出将包含 WhatsApp 与邮箱，确认继续？")) return;
              window.open(
                `/api/admin/inquiries/export?${queryString}&includeContact=1`,
                "_blank"
              );
            }}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            导出含联系方式
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {actionMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => applySummaryFilter(card.key)}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-[#FACC15] min-w-0"
          >
            <p className="text-xl font-bold text-[#1E293B] tabular-nums">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[#1E293B]">询盘漏斗</h2>
          {data.funnel.sampleSmall && (
            <span className="text-xs text-amber-700">样本较少</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {funnel.map((step) => (
            <div key={step.label} className="min-w-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">{step.label}</span>
                <span className="tabular-nums text-[#1E293B] font-semibold">
                  {step.value}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1E293B]"
                  style={{
                    width: `${Math.max((step.value / funnelMax) * 100, step.value > 0 ? 6 : 0)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#1E293B]">搜索与筛选</p>
          <button
            type="button"
            className="text-sm text-slate-600 lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {filtersOpen ? "收起筛选" : "展开筛选"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={fieldCls}
            placeholder="搜索编号 / 客户 / WhatsApp / 车辆 / 国家"
            value={filters.q}
            onChange={(e) =>
              setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))
            }
          />
          <select
            className={fieldCls}
            value={filters.sort}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                sort: e.target.value as InquirySort,
                page: 1,
              }))
            }
          >
            <option value="attention">默认（逾期优先）</option>
            <option value="newest">最新询盘</option>
            <option value="oldest">最早询盘</option>
            <option value="intent">意向最高</option>
            <option value="follow_up">下次跟进时间</option>
            <option value="updated">最近更新</option>
          </select>
        </div>
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${
            filtersOpen ? "" : "hidden lg:grid"
          }`}
        >
          <select
            className={fieldCls}
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))
            }
          >
            <option value="">全部状态</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className={fieldCls}
            value={filters.priority}
            onChange={(e) =>
              setFilters((f) => ({ ...f, priority: e.target.value, page: 1 }))
            }
          >
            <option value="">全部优先级</option>
            {INQUIRY_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {INQUIRY_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            className={fieldCls}
            value={filters.assigned}
            onChange={(e) =>
              setFilters((f) => ({ ...f, assigned: e.target.value, page: 1 }))
            }
          >
            <option value="">全部负责人</option>
            <option value="Shawn">Shawn</option>
            <option value="Miles">Miles</option>
          </select>
          <select
            className={fieldCls}
            value={filters.source}
            onChange={(e) =>
              setFilters((f) => ({ ...f, source: e.target.value, page: 1 }))
            }
          >
            <option value="">全部来源</option>
            {INQUIRY_SOURCES.map((s) => (
              <option key={s} value={s}>
                {INQUIRY_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            className={fieldCls}
            placeholder="客户国家"
            value={filters.country}
            onChange={(e) =>
              setFilters((f) => ({ ...f, country: e.target.value, page: 1 }))
            }
          />
          <select
            className={fieldCls}
            value={filters.followUp}
            onChange={(e) =>
              setFilters((f) => ({ ...f, followUp: e.target.value, page: 1 }))
            }
          >
            <option value="">跟进状态</option>
            <option value="today">今天需跟进</option>
            <option value="overdue">已逾期</option>
            <option value="next_7_days">未来 7 天</option>
            <option value="unset">未设置跟进</option>
            <option value="done">已完成</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-[#1E293B]">
            <input
              type="checkbox"
              checked={filters.archived}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  archived: e.target.checked,
                  page: 1,
                }))
              }
            />
            显示已归档
          </label>
          <button
            type="button"
            onClick={() => setFilters(defaultFilters)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            重置筛选
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            共 <span className="font-semibold text-[#1E293B]">{data.total}</span>{" "}
            条
            {loading ? " · 加载中…" : ""}
          </p>
        </div>

        {data.items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {filters.q || filters.status || filters.followUp
              ? "没有符合当前条件的询盘"
              : "暂无询盘记录"}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[64rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    {[
                      "询盘编号",
                      "客户",
                      "国家",
                      "来源",
                      "感兴趣车辆",
                      "数量",
                      "状态",
                      "优先级",
                      "意向评分",
                      "负责人",
                      "下次跟进",
                      "最后更新",
                      "操作",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-50 ${
                        item.isOverdue ? "bg-orange-50/60" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-[#1E293B]">
                        <Link
                          href={`/admin/inquiries/${item.id}`}
                          className="hover:underline font-semibold"
                        >
                          {item.inquiryNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[#1E293B]">
                        {item.customerName || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {item.customerCountry || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {INQUIRY_SOURCE_LABELS[item.source] || item.source}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 max-w-[10rem] truncate">
                        {item.vehicleTitleSnapshot || "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {item.requestedQuantity ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">{statusBadge(item.status)}</td>
                      <td className="px-3 py-2.5">{priorityBadge(item.priority)}</td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold">
                        {item.intentScore}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.assignedContactName || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.isOverdue && (
                          <span className="mr-1 text-xs font-semibold text-red-700">
                            已逾期
                          </span>
                        )}
                        <span className="text-slate-600">
                          {formatShanghai(item.nextFollowUpAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {formatShanghai(item.updatedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/admin/inquiries/${item.id}`}
                            className="text-xs font-semibold text-[#1E293B] underline"
                          >
                            详情
                          </Link>
                          <button
                            type="button"
                            className="text-xs text-slate-600 underline"
                            onClick={() => void quickStatus(item.id, "contacted")}
                          >
                            已联系
                          </button>
                          <button
                            type="button"
                            className="text-xs text-slate-600 underline"
                            onClick={() => void quickStatus(item.id, "interested")}
                          >
                            有意向
                          </button>
                          <button
                            type="button"
                            className="text-xs text-slate-600 underline"
                            onClick={() => void setFollowUp(item.id)}
                          >
                            跟进
                          </button>
                          <button
                            type="button"
                            className="text-xs text-emerald-700 underline"
                            onClick={() =>
                              void quickStatus(item.id, "won", "确认标记为已成交？")
                            }
                          >
                            成交
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-700 underline"
                            onClick={() =>
                              void quickStatus(item.id, "lost", "确认标记为已流失？")
                            }
                          >
                            流失
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="lg:hidden divide-y divide-slate-100">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className={`p-4 space-y-2 ${item.isOverdue ? "bg-orange-50/70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/inquiries/${item.id}`}
                        className="font-semibold text-[#1E293B] hover:underline"
                      >
                        {item.customerName || "未命名客户"}
                      </Link>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {item.inquiryNumber}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {statusBadge(item.status)}
                      {priorityBadge(item.priority)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    {item.customerCountry || "国家未填"} ·{" "}
                    {item.vehicleTitleSnapshot || "未指定车辆"}
                  </p>
                  <p className="text-xs text-slate-500">
                    负责人 {item.assignedContactName || "—"} · 意向{" "}
                    {item.intentScore}
                    {item.isOverdue ? " · " : " · 跟进 "}
                    {item.isOverdue && (
                      <span className="font-semibold text-red-700">已逾期 </span>
                    )}
                    {!item.isOverdue && formatShanghai(item.nextFollowUpAt)}
                    {item.isOverdue && formatShanghai(item.nextFollowUpAt)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={`/admin/inquiries/${item.id}`}
                      className="rounded-md bg-[#1E293B] px-2.5 py-1.5 text-xs font-semibold text-[#FACC15]"
                    >
                      详情
                    </Link>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs"
                      onClick={() => void quickStatus(item.id, "contacted")}
                    >
                      已联系
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs"
                      onClick={() => void setFollowUp(item.id)}
                    >
                      设置跟进
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-sm text-slate-600 tabular-nums">
              {filters.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  page: Math.min(totalPages, f.page + 1),
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
