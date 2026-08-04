"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "@/lib/admin/proforma/money";
import {
  PROFORMA_SALESPEOPLE,
  PROFORMA_STATUSES,
  PROFORMA_STATUS_LABELS,
  type ProformaListItem,
  type ProformaListResult,
  type ProformaSort,
  type ProformaStatus,
} from "@/lib/admin/proforma/types";
import ProformaPdfActions from "@/components/admin/ProformaPdfActions";

const fieldCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/50";

type Filters = {
  q: string;
  status: string;
  salesperson: string;
  destinationCountry: string;
  destinationPort: string;
  offerFrom: string;
  offerTo: string;
  sort: ProformaSort;
  archived: boolean;
  page: number;
};

const defaultFilters: Filters = {
  q: "",
  status: "",
  salesperson: "",
  destinationCountry: "",
  destinationPort: "",
  offerFrom: "",
  offerTo: "",
  sort: "newest",
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

function statusBadge(
  status: ProformaStatus,
  archivedAt: string | null
) {
  if (archivedAt) {
    return (
      <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
        已归档
      </span>
    );
  }
  const label = PROFORMA_STATUS_LABELS[status];
  const tone =
    status === "completed"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "cancelled"
        ? "bg-slate-100 text-slate-600 border-slate-200"
        : status === "paid_deposit"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : status === "issued"
            ? "bg-sky-50 text-sky-800 border-sky-200"
            : "bg-violet-50 text-violet-800 border-violet-200";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}

export default function AdminProformaInvoicesClient({
  initial,
}: {
  initial: ProformaListResult;
}) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (f.q.trim()) params.set("q", f.q.trim());
      if (f.status) params.set("status", f.status);
      if (f.salesperson) params.set("salesperson", f.salesperson);
      if (f.destinationCountry.trim())
        params.set("destinationCountry", f.destinationCountry.trim());
      if (f.destinationPort.trim())
        params.set("destinationPort", f.destinationPort.trim());
      if (f.offerFrom) params.set("offerFrom", f.offerFrom);
      if (f.offerTo) params.set("offerTo", f.offerTo);
      if (f.archived) params.set("archived", "1");
      params.set("sort", f.sort);
      params.set("page", String(f.page));
      params.set("pageSize", "20");

      const res = await fetch(
        `/api/admin/proforma-invoices?${params.toString()}`,
        { credentials: "include", cache: "no-store" }
      );
      const json = (await res.json()) as ProformaListResult & {
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error || "加载失败");
        return;
      }
      setData(json);
    } catch {
      setMessage("加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const patchFilter = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  };

  const runAction = async (
    id: string,
    action: () => Promise<void>
  ) => {
    setBusyId(id);
    setMessage(null);
    try {
      await action();
      await load(filters);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessage("已取消分享");
      } else {
        setMessage(err instanceof Error ? err.message : "操作失败");
      }
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (id: string, status: ProformaStatus) =>
    runAction(id, async () => {
      const res = await fetch(`/api/admin/proforma-invoices/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "状态更新失败");
      setMessage("状态已更新");
    });

  const archive = (id: string, archiveFlag: boolean) =>
    runAction(id, async () => {
      const res = await fetch(`/api/admin/proforma-invoices/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: archiveFlag }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "归档失败");
      setMessage(archiveFlag ? "已归档" : "已取消归档");
    });

  const duplicate = (id: string) =>
    runAction(id, async () => {
      const res = await fetch(
        `/api/admin/proforma-invoices/${id}/duplicate`,
        { method: "POST", credentials: "include" }
      );
      const json = (await res.json()) as {
        error?: string;
        id?: string;
        invoiceNumber?: string;
      };
      if (!res.ok) throw new Error(json.error || "复制失败");
      setMessage(`已复制为 ${json.invoiceNumber}`);
      if (json.id) {
        window.location.href = `/admin/proforma-invoices/${json.id}/edit`;
      }
    });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">形式发票管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            创建、保存、查看和下载客户形式发票。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/proforma-invoices/new"
            className="inline-flex items-center rounded-lg bg-[#FACC15] px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:brightness-95"
          >
            新建形式发票
          </Link>
          <button
            type="button"
            onClick={() =>
              patchFilter({ archived: !filters.archived, page: 1 })
            }
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50"
          >
            {filters.archived ? "查看有效发票" : "发票记录 / 归档"}
          </button>
          <Link
            href="/admin/settings"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            公司与收款设置
          </Link>
        </div>
      </div>

      {data.error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {message}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold text-slate-500">
            搜索
            <input
              className={`${fieldCls} mt-1`}
              placeholder="发票号 / 合同号 / 客户 / VIN / 车型…"
              value={filters.q}
              onChange={(e) => patchFilter({ q: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            状态
            <select
              className={`${fieldCls} mt-1`}
              value={filters.status}
              onChange={(e) => patchFilter({ status: e.target.value })}
            >
              <option value="">全部</option>
              {PROFORMA_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROFORMA_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            销售人员
            <select
              className={`${fieldCls} mt-1`}
              value={filters.salesperson}
              onChange={(e) => patchFilter({ salesperson: e.target.value })}
            >
              <option value="">全部</option>
              {PROFORMA_SALESPEOPLE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            排序
            <select
              className={`${fieldCls} mt-1`}
              value={filters.sort}
              onChange={(e) =>
                patchFilter({ sort: e.target.value as ProformaSort })
              }
            >
              <option value="newest">最新开具</option>
              <option value="oldest">最早开具</option>
              <option value="highest_total">金额最高</option>
              <option value="latest_updated">最近更新</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            目的国家
            <input
              className={`${fieldCls} mt-1`}
              value={filters.destinationCountry}
              onChange={(e) =>
                patchFilter({ destinationCountry: e.target.value })
              }
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            目的港
            <input
              className={`${fieldCls} mt-1`}
              value={filters.destinationPort}
              onChange={(e) =>
                patchFilter({ destinationPort: e.target.value })
              }
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            报价日起
            <input
              type="date"
              className={`${fieldCls} mt-1`}
              value={filters.offerFrom}
              onChange={(e) => patchFilter({ offerFrom: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            报价日至
            <input
              type="date"
              className={`${fieldCls} mt-1`}
              value={filters.offerTo}
              onChange={(e) => patchFilter({ offerTo: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">发票编号</th>
                <th className="px-3 py-3">合同号</th>
                <th className="px-3 py-3">客户</th>
                <th className="px-3 py-3">国家</th>
                <th className="px-3 py-3">车辆</th>
                <th className="px-3 py-3">总金额</th>
                <th className="px-3 py-3">销售</th>
                <th className="px-3 py-3">状态</th>
                <th className="px-3 py-3">报价日期</th>
                <th className="px-3 py-3">更新时间</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    加载中…
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    暂无形式发票记录
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3 font-semibold text-[#1E293B]">
                      {row.invoiceNumber}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {row.contractNumber || "—"}
                    </td>
                    <td className="px-3 py-3 text-[#1E293B]">
                      {row.customerName}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {row.destinationCountry ||
                        row.customerCountry ||
                        "—"}
                    </td>
                    <td className="px-3 py-3">{row.vehicleCount}</td>
                    <td className="px-3 py-3 font-medium">
                      {formatUsd(row.totalUsd)}
                    </td>
                    <td className="px-3 py-3">{row.salespersonName}</td>
                    <td className="px-3 py-3">
                      {statusBadge(row.status, row.archivedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.offerDate}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500">
                      {formatShanghai(row.updatedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-[180px] flex-wrap gap-1">
                        <Link
                          href={`/admin/proforma-invoices/${row.id}`}
                          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                        >
                          查看
                        </Link>
                        <Link
                          href={`/admin/proforma-invoices/${row.id}/edit`}
                          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                        >
                          {row.status === "draft" ? "编辑草稿" : "编辑"}
                        </Link>
                        <ProformaPdfActions
                          key={row.id}
                          invoiceId={row.id}
                          invoiceNumber={row.invoiceNumber}
                          disabled={busyId === row.id}
                          compact
                          onMessage={setMessage}
                          onError={(err) => setMessage(err)}
                        />
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void duplicate(row.id)}
                          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-50"
                        >
                          复制为新发票
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void setStatus(row.id, "issued")}
                          className="rounded border border-sky-200 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50 disabled:opacity-50"
                        >
                          标记已开具
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void setStatus(row.id, "paid_deposit")}
                          className="rounded border border-amber-200 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                        >
                          标记已收定金
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void setStatus(row.id, "completed")}
                          className="rounded border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          标记已完成
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void setStatus(row.id, "cancelled")}
                          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() =>
                            void archive(row.id, !filters.archived)
                          }
                          className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {filters.archived ? "取消归档" : "归档"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            共 {data.total} 条
            {loading ? " · 刷新中…" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => patchFilter({ page: filters.page - 1 })}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              上一页
            </button>
            <span>
              {filters.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => patchFilter({ page: filters.page + 1 })}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
