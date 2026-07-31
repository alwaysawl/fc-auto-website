"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  type AvailabilityStatus,
  type SalesTeamDashboard,
  type SalesTeamRangePreset,
} from "@/lib/admin/sales-team/types";

const fieldCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/50";

const PRESETS: { id: SalesTeamRangePreset; label: string }[] = [
  { id: "today", label: "今天" },
  { id: "7d", label: "最近 7 天" },
  { id: "30d", label: "最近 30 天" },
  { id: "month", label: "本月" },
  { id: "custom", label: "自定义日期" },
];

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

function inquiryLink(
  assigned: string,
  extra?: { followUp?: string; status?: string }
): string {
  const p = new URLSearchParams();
  p.set("assigned", assigned);
  if (extra?.followUp) p.set("followUp", extra.followUp);
  if (extra?.status) p.set("status", extra.status);
  return `/admin/inquiries?${p.toString()}`;
}

export default function AdminSalesTeamClient({
  initial,
}: {
  initial: SalesTeamDashboard;
}) {
  const [data, setData] = useState(initial);
  const [preset, setPreset] = useState<SalesTeamRangePreset>(
    initial.range.preset
  );
  const [customStart, setCustomStart] = useState(initial.range.startLabel);
  const [customEnd, setCustomEnd] = useState(initial.range.endLabel);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(initial.error);
  const [revealed, setRevealed] = useState<
    Record<string, { whatsappNumber: string | null; whatsappLabel: string | null }>
  >({});
  const [contactDrafts, setContactDrafts] = useState<
    Record<
      string,
      {
        displayName: string;
        whatsappNumber: string;
        whatsappLabel: string;
        qrPath: string;
      }
    >
  >({});

  const load = useCallback(
    async (nextPreset: SalesTeamRangePreset, start: string, end: string) => {
      setLoading(true);
      setErr(null);
      try {
        const params = new URLSearchParams({ preset: nextPreset });
        if (nextPreset === "custom") {
          params.set("start", start);
          params.set("end", end);
        }
        const res = await fetch(`/api/admin/sales-team?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setErr(json.error || "销售团队数据加载失败，请稍后重试");
          return;
        }
        setData(json as SalesTeamDashboard);
        if (json.error) setErr(json.error);
      } catch {
        setErr("销售团队数据加载失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const drafts: typeof contactDrafts = {};
    for (const s of data.shareholders) {
      if (s.id.startsWith("missing-")) continue;
      drafts[s.id] = {
        displayName: s.displayName,
        whatsappNumber: "",
        whatsappLabel: s.whatsappLabel || "",
        qrPath: s.qrPath || "",
      };
    }
    setContactDrafts(drafts);
  }, [data.shareholders]);

  async function changeAvailability(id: string, status: AvailabilityStatus) {
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/sales-team/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityStatus: status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "设置保存失败，请稍后重试");
        return;
      }
      setMsg(json.message || "接收询盘状态已更新");
      await load(preset, customStart, customEnd);
    } catch {
      setErr("设置保存失败，请稍后重试");
    }
  }

  async function revealContact(id: string) {
    setErr(null);
    try {
      const res = await fetch(`/api/admin/sales-team/${id}?reveal=1`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "联系方式尚未配置");
        return;
      }
      setRevealed((prev) => ({
        ...prev,
        [id]: {
          whatsappNumber: json.whatsappNumber,
          whatsappLabel: json.whatsappLabel,
        },
      }));
      setContactDrafts((prev) => ({
        ...prev,
        [id]: {
          displayName: json.displayName || prev[id]?.displayName || "",
          whatsappNumber: json.whatsappNumber || "",
          whatsappLabel: json.whatsappLabel || "",
          qrPath: json.qrPath || prev[id]?.qrPath || "",
        },
      }));
    } catch {
      setErr("联系方式加载失败，请稍后重试");
    }
  }

  async function saveContact(id: string) {
    const draft = contactDrafts[id];
    if (!draft) return;
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/sales-team/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: draft.displayName,
          whatsappNumber: draft.whatsappNumber || undefined,
          whatsappLabel: draft.whatsappLabel,
          qrPath: draft.qrPath,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "设置保存失败，请稍后重试");
        return;
      }
      setMsg(json.message || "设置已保存");
      await load(preset, customStart, customEnd);
    } catch {
      setErr("设置保存失败，请稍后重试");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl min-w-0">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">销售团队</h1>
        <p className="text-sm text-slate-500 mt-1">
          管理 Shawn 与 Miles 的客户分配、询盘跟进和当前工作状态。
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {data.noActiveWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {data.noActiveWarning}
        </div>
      )}

      {/* Summary */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "当前可接收询盘", value: data.summary.activeReceivers },
          { label: "未关闭询盘", value: data.summary.openInquiries },
          { label: "今日需跟进", value: data.summary.todayFollowUp },
          { label: "已逾期", value: data.summary.overdue },
          { label: "最近 30 天新分配", value: data.summary.assignedLast30d },
          { label: "最近 30 天成交", value: data.summary.wonLast30d },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0"
          >
            <p className="text-2xl font-bold text-[#1E293B] tabular-nums">
              {c.value}
            </p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </section>

      {/* Date filter */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-[#1E293B]">时间范围</p>
        <p className="text-xs text-slate-400">
          仅影响分配统计与时段结果；当前工作量始终为实时数据。范围{" "}
          {data.range.startLabel} ~ {data.range.endLabel}
          {loading ? " · 加载中…" : ""}
        </p>
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
              <span className="text-slate-600">开始</span>
              <input
                type="date"
                className={fieldCls}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">结束</span>
              <input
                type="date"
                className={fieldCls}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => void load("custom", customStart, customEnd)}
              className="rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-[#1E293B]"
            >
              应用
            </button>
          </div>
        )}
      </section>

      {/* Shareholder cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.shareholders.map((s) => (
          <article
            key={s.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 min-w-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#1E293B]">{s.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  身份：{s.identityLabel}
                </p>
                <p className="text-xs text-slate-400 mt-1">{s.displayName}</p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  s.availabilityStatus === "active"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-900 border-amber-200"
                }`}
              >
                {s.availabilityLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {[
                { label: "当前负责询盘数", value: s.workload.openInquiries },
                { label: "今日需跟进", value: s.workload.todayFollowUp },
                { label: "已逾期跟进", value: s.workload.overdue },
                { label: "有意向客户", value: s.workload.interested },
                { label: "报价中", value: s.workload.quoting },
                { label: "谈判中", value: s.workload.negotiating },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg bg-slate-50 border border-slate-100 p-2.5"
                >
                  <p className="text-lg font-bold text-[#1E293B] tabular-nums">
                    {m.value}
                  </p>
                  <p className="text-[11px] text-slate-500">{m.label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              最近一次分配时间：{formatShanghai(s.lastAssignedAt)}
            </p>

            {!s.id.startsWith("missing-") && (
              <label className="block text-sm">
                <span className="text-slate-600">接收询盘状态</span>
                <select
                  className={fieldCls}
                  value={s.availabilityStatus}
                  onChange={(e) =>
                    void changeAvailability(
                      s.id,
                      e.target.value as AvailabilityStatus
                    )
                  }
                >
                  {AVAILABILITY_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {AVAILABILITY_LABELS[st]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href={inquiryLink(s.name)}
                className="rounded-lg bg-[#1E293B] px-3 py-2 text-xs font-semibold text-[#FACC15]"
              >
                查看负责询盘
              </Link>
              <Link
                href={inquiryLink(s.name, { followUp: "today" })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                今日需跟进
              </Link>
              <Link
                href={inquiryLink(s.name, { followUp: "overdue" })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                已逾期
              </Link>
              <Link
                href={inquiryLink(s.name, { status: "interested" })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                有意向
              </Link>
              <Link
                href={inquiryLink(s.name, { status: "quoting" })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                报价中
              </Link>
              <Link
                href={inquiryLink(s.name, { status: "negotiating" })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                谈判中
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <button
                type="button"
                onClick={() => void revealContact(s.id)}
                disabled={s.id.startsWith("missing-")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#1E293B] disabled:opacity-50"
              >
                查看联系方式
              </button>
              {revealed[s.id] ? (
                <p className="text-sm text-[#1E293B]">
                  WhatsApp：{" "}
                  {revealed[s.id]?.whatsappNumber || "联系方式尚未配置"}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  {s.hasWhatsApp
                    ? "联系方式已配置（点击后查看）"
                    : "联系方式尚未配置"}
                </p>
              )}
            </div>
          </article>
        ))}
      </section>

      {/* Workload */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
          当前工作量
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                {[
                  "负责人",
                  "未关闭询盘",
                  "今日需跟进",
                  "已逾期",
                  "高优先级",
                  "有意向",
                  "报价中",
                  "谈判中",
                ].map((h) => (
                  <th key={h} className="py-2 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.shareholders.map((s) => (
                <tr key={`wl-${s.id}`} className="border-b border-slate-50">
                  <td className="py-2.5 pr-3 font-medium text-[#1E293B]">
                    {s.name}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {s.workload.openInquiries}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {s.workload.todayFollowUp}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {s.workload.overdue}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {s.workload.highPriority}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {s.workload.interested}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {s.workload.quoting}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {s.workload.negotiating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Assignment balance */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-[#1E293B]">分配情况</h2>
        <p className="text-xs text-slate-400">
          运营参考信息，不作为业绩排名。摘要：{data.balance.summaryLabel}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-[#1E293B]">
              {data.balance.shawnCount}
            </p>
            <p className="text-xs text-slate-500">
              Shawn 分配数量（{data.balance.shawnPercent}%）
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-[#1E293B]">
              {data.balance.milesCount}
            </p>
            <p className="text-xs text-slate-500">
              Miles 分配数量（{data.balance.milesPercent}%）
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-[#1E293B]">
              {data.balance.total}
            </p>
            <p className="text-xs text-slate-500">总分配</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-semibold text-[#1E293B]">
              {data.balance.nextRecipient || "—"}
            </p>
            <p className="text-xs text-slate-500">下一位接收人（可接收时）</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          最近分配：{formatShanghai(data.balance.latestAt)}
        </p>
      </section>

      {/* Period results */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
          所选时段结果
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-[#1E293B]">
              {data.periodResults.won}
            </p>
            <p className="text-xs text-slate-500">已成交询盘数量</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-[#1E293B]">
              {data.periodResults.lost}
            </p>
            <p className="text-xs text-slate-500">已流失询盘数量</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-[#1E293B]">
              {data.periodResults.open}
            </p>
            <p className="text-xs text-slate-500">暂未关闭数量</p>
          </div>
        </div>
      </section>

      {/* Recent assignments */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
          最近分配记录
        </h2>
        {data.recentAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">暂无分配记录</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    {[
                      "时间",
                      "询盘编号",
                      "客户",
                      "车辆",
                      "负责人",
                      "类型",
                      "来源",
                    ].map((h) => (
                      <th key={h} className="py-2 pr-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentAssignments.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                        {formatShanghai(row.at)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {row.inquiryId ? (
                          <Link
                            href={`/admin/inquiries/${row.inquiryId}`}
                            className="font-semibold text-[#1E293B] hover:underline"
                          >
                            {row.inquiryNumber || row.inquiryId.slice(0, 8)}
                          </Link>
                        ) : (
                          row.inquiryNumber || "—"
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {row.customerName || "—"}
                      </td>
                      <td className="py-2.5 pr-3 max-w-[10rem] truncate">
                        {row.vehicleTitle || "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-medium">
                        {row.assignedContact}
                      </td>
                      <td className="py-2.5 pr-3">{row.assignmentType}</td>
                      <td className="py-2.5 pr-3 text-slate-500">
                        {row.source || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden space-y-3">
              {data.recentAssignments.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-slate-100 p-3 space-y-1"
                >
                  <p className="text-xs text-slate-400">
                    {formatShanghai(row.at)} · {row.assignmentType}
                  </p>
                  <p className="text-sm font-semibold text-[#1E293B]">
                    {row.inquiryId ? (
                      <Link
                        href={`/admin/inquiries/${row.inquiryId}`}
                        className="hover:underline"
                      >
                        {row.inquiryNumber || "询盘"}
                      </Link>
                    ) : (
                      row.inquiryNumber || "—"
                    )}{" "}
                    · {row.assignedContact}
                  </p>
                  <p className="text-xs text-slate-600">
                    {row.customerName || "客户未填"} ·{" "}
                    {row.vehicleTitle || "未指定车辆"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Recent activity */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">
          最近团队动态
        </h2>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">暂无团队动态</p>
        ) : (
          <ul className="space-y-3">
            {data.recentActivity.map((a) => (
              <li
                key={a.id}
                className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-slate-50 pb-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#1E293B]">
                    <span className="font-semibold">
                      {a.shareholderName || "团队"}
                    </span>{" "}
                    {a.description}
                    {a.inquiryNumber && (
                      <>
                        {" · "}
                        {a.inquiryId ? (
                          <Link
                            href={`/admin/inquiries/${a.inquiryId}`}
                            className="font-mono text-xs underline"
                          >
                            {a.inquiryNumber}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs">
                            {a.inquiryNumber}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                  {formatShanghai(a.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Contact settings */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B]">
            联系方式设置
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            保存后同步用于报价、二维码与 WhatsApp 路由展示。请先点击「查看联系方式」再编辑号码。
          </p>
        </div>
        {data.shareholders
          .filter((s) => !s.id.startsWith("missing-"))
          .map((s) => {
            const draft = contactDrafts[s.id];
            if (!draft) return null;
            return (
              <div
                key={`contact-${s.id}`}
                className="rounded-lg border border-slate-100 p-4 space-y-3"
              >
                <p className="font-semibold text-[#1E293B]">{s.name}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="text-slate-600">对外显示名称</span>
                    <input
                      className={fieldCls}
                      value={draft.displayName}
                      onChange={(e) =>
                        setContactDrafts((prev) => ({
                          ...prev,
                          [s.id]: { ...draft, displayName: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">WhatsApp 号码</span>
                    <input
                      className={fieldCls}
                      value={draft.whatsappNumber}
                      placeholder={
                        revealed[s.id]
                          ? "已加载"
                          : "请先点击上方「查看联系方式」"
                      }
                      onChange={(e) =>
                        setContactDrafts((prev) => ({
                          ...prev,
                          [s.id]: { ...draft, whatsappNumber: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">WhatsApp 显示标签</span>
                    <input
                      className={fieldCls}
                      value={draft.whatsappLabel}
                      onChange={(e) =>
                        setContactDrafts((prev) => ({
                          ...prev,
                          [s.id]: { ...draft, whatsappLabel: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">二维码路径</span>
                    <input
                      className={fieldCls}
                      value={draft.qrPath}
                      onChange={(e) =>
                        setContactDrafts((prev) => ({
                          ...prev,
                          [s.id]: { ...draft, qrPath: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void saveContact(s.id)}
                  className="rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-[#1E293B]"
                >
                  保存 {s.name} 联系方式
                </button>
              </div>
            );
          })}
      </section>
    </div>
  );
}
