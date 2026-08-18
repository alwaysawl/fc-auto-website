"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import VehicleStatusBadge from "./VehicleStatusBadge";

interface Props {
  vehicles: Vehicle[];
  locale?: string;
}

function coverSrc(v: Vehicle): string | null {
  return v.mainImageUrl?.trim() || v.photos?.[0] || null;
}

function vehicleTitle(v: Vehicle): string {
  return v.titleEn?.trim() || `${v.brand} ${v.model}`;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function hasCoverImage(v: Vehicle): boolean {
  return Boolean(coverSrc(v));
}

// ─── Inline price editor ──────────────────────────────────────────────────────
interface PriceEditorProps {
  vehicleId: string;
  currentPrice: number;
  onSaved: (updated: Vehicle) => void;
  onError: (msg: string) => void;
}

function PriceEditor({ vehicleId, currentPrice, onSaved, onError }: PriceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentPrice));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openEditor = () => {
    setValue(String(currentPrice));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const cancel = () => {
    setEditing(false);
    setValue(String(currentPrice));
  };

  const save = async () => {
    const num = Number(value);
    if (!value.trim() || isNaN(num) || num < 0) {
      onError("请输入有效的非负数价格。");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: vehicleId, fobPrice: num }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "保存失败");
      }
      const updated = (await res.json()) as Vehicle;
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "调价失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void save();
    if (e.key === "Escape") cancel();
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
        <span className="text-sm font-medium text-slate-800 truncate">
          ${currentPrice.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={openEditor}
          className="flex-shrink-0 px-1.5 py-0.5 text-[11px] rounded border border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors leading-none"
          title="调价"
        >
          调价
        </button>
      </div>
    );
  }

  // Editing state — all controls stay within the price column
  return (
    <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden">
      <span className="flex-shrink-0 text-sm font-medium text-slate-700">$</span>
      <input
        ref={inputRef}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={saving}
        className="w-[90px] flex-shrink-0 h-[30px] px-2 text-sm text-right font-medium text-slate-900 bg-white border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="flex-shrink-0 px-2 h-[28px] text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 leading-none whitespace-nowrap"
      >
        {saving ? "保存中…" : "保存"}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={saving}
        className="flex-shrink-0 px-1.5 h-[28px] text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50 leading-none whitespace-nowrap"
      >
        取消
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VehicleManagementTable({
  vehicles,
  locale = "en",
}: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(vehicles);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  const patchStatus = async (id: string, status: VehicleStatus) => {
    setLoadingId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "保存失败");
      }
      const updated = (await res.json()) as Vehicle;
      setLocalVehicles((prev) =>
        prev.map((v) => (v.id === updated.id ? updated : v))
      );
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "操作失败，请重试。");
    } finally {
      setLoadingId(null);
    }
  };

  const patchHomepageFeatured = async (id: string, featured: boolean) => {
    setLoadingId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/homepage-featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, featured }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        vehicle?: Vehicle;
      };
      if (!res.ok) {
        throw new Error(data.error || "首页推荐更新失败");
      }
      const updated = data.vehicle;
      if (updated) {
        setLocalVehicles((prev) =>
          prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v))
        );
      } else {
        setLocalVehicles((prev) =>
          prev.map((v) =>
            v.id === id
              ? { ...v, featured, homepageRank: featured ? v.homepageRank : null }
              : v
          )
        );
      }
      setSuccessMsg(data.message || "保存成功");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "操作失败，请重试。");
    } finally {
      setLoadingId(null);
    }
  };

  const requestStatusChange = (v: Vehicle, status: VehicleStatus) => {
    if (status === "在售" && !hasCoverImage(v)) {
      setErrorMsg("上架前请至少添加一张封面图片。");
      return;
    }
    if (status === "已售") {
      const name = vehicleTitle(v);
      const ok = window.confirm(
        `确认将「${name}」标记为已售？\n库存编号：${v.id}\n\n已售车辆将从前台库存中隐藏。`
      );
      if (!ok) return;
    }
    void patchStatus(v.id, status);
  };

  const deleteVehicle = async (v: Vehicle) => {
    const name = vehicleTitle(v);
    const first = window.confirm(
      `确定要删除「${name}」吗？\n库存编号：${v.id}`
    );
    if (!first) return;

    const second = window.confirm(
      `此操作将永久删除该车辆，无法恢复。\n确认永久删除「${name}」？`
    );
    if (!second) return;

    setLoadingId(v.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(v.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        storageWarning?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "删除失败");
      }
      setLocalVehicles((prev) => prev.filter((row) => row.id !== v.id));
      if (data.storageWarning) {
        setErrorMsg(`车辆已删除。${data.storageWarning}`);
      }
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "删除失败，请重试。");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePriceSaved = (updated: Vehicle) => {
    setLocalVehicles((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v))
    );
    setSuccessMsg("价格已更新");
    setTimeout(() => setSuccessMsg(null), 3000);
    router.refresh();
  };

  const renderActions = (
    v: Vehicle,
    isLoading: boolean,
    currentStatus: VehicleStatus
  ) => (
    <div className="flex items-center gap-1 flex-wrap">
      <Link
        href={`/${locale}/inventory/${v.id}`}
        target="_blank"
        className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors whitespace-nowrap"
      >
        预览
      </Link>
      <Link
        href={`/admin/vehicles/${v.id}/edit`}
        className="px-2 py-1 text-xs rounded-md bg-[#1E293B] text-white hover:bg-slate-700 transition-colors whitespace-nowrap"
      >
        编辑
      </Link>
      {v.featured ? (
        <button
          type="button"
          onClick={() => void patchHomepageFeatured(v.id, false)}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap"
          title="从首页移除"
        >
          取消推荐
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void patchHomepageFeatured(v.id, true)}
          disabled={isLoading || v.status !== "在售"}
          className="px-2 py-1 text-xs rounded-md bg-[#FACC15]/25 text-yellow-900 border border-yellow-200 hover:bg-[#FACC15]/40 transition-colors disabled:opacity-50 whitespace-nowrap"
          title={v.status !== "在售" ? "只有在售车辆可以推荐到首页" : "推荐到首页"}
        >
          推荐
        </button>
      )}
      {currentStatus === "在售" ? (
        <button
          type="button"
          onClick={() => requestStatusChange(v, "已下架")}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          下架
        </button>
      ) : currentStatus !== "已售" ? (
        <button
          type="button"
          onClick={() => requestStatusChange(v, "在售")}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          上架
        </button>
      ) : null}
      {currentStatus !== "已售" && (
        <button
          type="button"
          onClick={() => requestStatusChange(v, "已售")}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded-md bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          已售
        </button>
      )}
      <button
        type="button"
        onClick={() => void deleteVehicle(v)}
        disabled={isLoading}
        className="px-2 py-1 text-xs rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        删除
      </button>
    </div>
  );

  if (localVehicles.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 text-sm">
        暂无车辆记录。
      </div>
    );
  }

  return (
    <div>
      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {successMsg}
        </div>
      )}

      <div className="mb-3 flex justify-end">
        <Link
          href="/admin/homepage-featured"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E293B] hover:underline"
        >
          首页推荐管理 →
        </Link>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "60px" }} />   {/* 主图 */}
            <col style={{ width: "160px" }} />  {/* 标题 */}
            <col style={{ width: "56px" }} />   {/* 推荐 */}
            <col style={{ width: "120px" }} />  {/* 库存编号 */}
            <col style={{ width: "80px" }} />   {/* 品牌 */}
            <col style={{ width: "80px" }} />   {/* 车型 */}
            <col style={{ width: "48px" }} />   {/* 年份 */}
            <col style={{ width: "168px" }} />  {/* 价格（含调价控件） */}
            <col style={{ width: "90px" }} />   {/* 里程 */}
            <col style={{ width: "68px" }} />   {/* 状态 */}
            <col style={{ width: "76px" }} />   {/* 创建 */}
            <col style={{ width: "76px" }} />   {/* 更新 */}
            <col style={{ width: "220px" }} />  {/* 操作 */}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {[
                "主图", "标题", "推荐", "库存编号",
                "品牌", "车型", "年份", "价格",
                "里程", "状态", "创建", "更新", "操作",
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-2 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap${i === 12 ? " sticky right-0 bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {localVehicles.map((v) => {
              const isLoading = loadingId === v.id;
              const currentStatus = (v.status ?? "在售") as VehicleStatus;
              const thumb = coverSrc(v);
              return (
                <tr
                  key={v.id}
                  className={`hover:bg-slate-50 transition-colors${isLoading ? " opacity-60" : ""}`}
                >
                  {/* 主图 */}
                  <td className="px-2 py-2">
                    <div className="w-12 h-9 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={vehicleTitle(v)}
                          width={48}
                          height={36}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">
                          无图
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 标题 */}
                  <td className="px-2 py-2 overflow-hidden">
                    <p
                      className="font-medium text-[#1E293B] truncate text-xs"
                      title={vehicleTitle(v)}
                    >
                      {vehicleTitle(v)}
                    </p>
                  </td>

                  {/* 推荐 */}
                  <td className="px-2 py-2 whitespace-nowrap">
                    {v.featured ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded bg-[#FACC15]/30 text-yellow-800">
                        ⭐{v.homepageRank ? ` #${v.homepageRank}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* 库存编号 */}
                  <td className="px-2 py-2 overflow-hidden">
                    <span
                      className="font-mono text-[11px] text-slate-600 block truncate"
                      title={v.id}
                    >
                      {v.id}
                    </span>
                  </td>

                  {/* 品牌 */}
                  <td className="px-2 py-2 overflow-hidden">
                    <span className="text-xs text-slate-700 truncate block" title={v.brand}>
                      {v.brand}
                    </span>
                  </td>

                  {/* 车型 */}
                  <td className="px-2 py-2 overflow-hidden">
                    <span className="text-xs text-slate-600 truncate block" title={v.model}>
                      {v.model}
                    </span>
                  </td>

                  {/* 年份 */}
                  <td className="px-2 py-2 text-xs text-slate-700 whitespace-nowrap">
                    {v.year}
                  </td>

                  {/* 价格（含快速调价） */}
                  <td className="px-2 py-2">
                    <PriceEditor
                      vehicleId={v.id}
                      currentPrice={v.fobPrice}
                      onSaved={handlePriceSaved}
                      onError={(msg) => setErrorMsg(msg)}
                    />
                  </td>

                  {/* 里程 */}
                  <td className="px-2 py-2 text-xs text-slate-600 whitespace-nowrap">
                    {(v.mileage ?? 0).toLocaleString()} km
                  </td>

                  {/* 状态 */}
                  <td className="px-2 py-2">
                    <VehicleStatusBadge status={currentStatus} />
                  </td>

                  {/* 创建 */}
                  <td className="px-2 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDate(v.createdAt)}
                  </td>

                  {/* 更新 */}
                  <td className="px-2 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDate(v.updatedAt)}
                  </td>

                  {/* 操作（sticky） */}
                  <td className="px-2 py-2 sticky right-0 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    {renderActions(v, isLoading, currentStatus)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="lg:hidden space-y-4 p-4">
        {localVehicles.map((v) => {
          const isLoading = loadingId === v.id;
          const currentStatus = (v.status ?? "在售") as VehicleStatus;
          const thumb = coverSrc(v);
          return (
            <div
              key={v.id}
              className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4${isLoading ? " opacity-60" : ""}`}
            >
              <div className="flex gap-3 mb-3">
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={vehicleTitle(v)}
                      width={96}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                      无图
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1E293B] truncate">{vehicleTitle(v)}</p>
                  <p className="text-xs text-slate-500 font-mono truncate">{v.id}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {v.brand} · {v.model} · {v.year}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <VehicleStatusBadge status={currentStatus} />
                    {v.featured && (
                      <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded bg-[#FACC15]/30 text-yellow-800">
                        ⭐{v.homepageRank ? ` #${v.homepageRank}` : " Featured"}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      ${v.fobPrice.toLocaleString()} · {(v.mileage ?? 0).toLocaleString()} km
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    创建 {formatDate(v.createdAt)}
                    {v.updatedAt ? ` · 更新 ${formatDate(v.updatedAt)}` : ""}
                  </p>
                </div>
              </div>
              {renderActions(v, isLoading, currentStatus)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
