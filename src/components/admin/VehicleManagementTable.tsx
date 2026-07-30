"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import VehicleStatusBadge from "./VehicleStatusBadge";

interface Props {
  vehicles: Vehicle[];
  locale?: string;
}

function coverSrc(v: Vehicle): string | null {
  return v.mainImageUrl?.trim() || v.photos?.[0] || null;
}

export default function VehicleManagementTable({
  vehicles,
  locale = "en",
}: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(vehicles);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  const patchStatus = async (id: string, status: VehicleStatus) => {
    setLoadingId(id);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      const updated: Vehicle = await res.json();
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

  const patchFeatured = async (id: string, featured: boolean) => {
    setLoadingId(id);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, featured }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      const updated: Vehicle = await res.json();
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

  /**
   * Permanent delete only (no soft-delete/archive in this project).
   * Two Chinese confirmations required.
   */
  const deleteVehicle = async (v: Vehicle) => {
    const name = `${v.brand} ${v.model}（${v.year}）`;
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
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(v.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
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

  const renderActions = (v: Vehicle, isLoading: boolean, currentStatus: VehicleStatus) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Link
        href={`/${locale}/inventory/${v.id}`}
        target="_blank"
        className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors whitespace-nowrap"
      >
        查看前台
      </Link>
      <Link
        href={`/admin/vehicles/${v.id}/edit`}
        className="px-2 py-1 text-xs rounded-md bg-[#1E293B] text-white hover:bg-slate-700 transition-colors"
      >
        编辑
      </Link>
      {currentStatus === "在售" ? (
        <button
          type="button"
          onClick={() => patchStatus(v.id, "已下架")}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          下架
        </button>
      ) : currentStatus !== "已售" ? (
        <button
          type="button"
          onClick={() => patchStatus(v.id, "在售")}
          disabled={isLoading}
          className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          上架
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => deleteVehicle(v)}
        disabled={isLoading}
        className="px-2 py-1 text-xs rounded-md bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        删除
      </button>
    </div>
  );

  if (localVehicles.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 text-sm">暂无车辆记录。</div>
    );
  }

  return (
    <div>
      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {[
                "主图", "库存编号", "品牌 / 车型", "年份",
                "FOB 价格", "变速箱", "状态", "推荐", "更新时间", "操作",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
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
                  className={`hover:bg-slate-50 transition-colors ${isLoading ? "opacity-60" : ""}`}
                >
                  <td className="px-3 py-3">
                    <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={`${v.brand} ${v.model}`}
                          width={56}
                          height={40}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                          无图
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {v.id}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-[#1E293B]">{v.brand}</p>
                    <p className="text-slate-500 text-xs">{v.model}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{v.year}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                    ${v.fobPrice.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {v.transmission === "Automatic"
                      ? "自动"
                      : v.transmission === "Manual"
                      ? "手动"
                      : v.transmission}
                  </td>
                  <td className="px-3 py-3">
                    <VehicleStatusBadge status={currentStatus} />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => patchFeatured(v.id, !v.featured)}
                      disabled={isLoading}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                        v.featured
                          ? "bg-[#FACC15]/20 text-yellow-800 border-[#FACC15]/50 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-[#FACC15]/20 hover:text-yellow-800 hover:border-[#FACC15]/50"
                      }`}
                    >
                      {v.featured ? "推荐" : "普通"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {v.updatedAt
                      ? new Date(v.updatedAt).toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {renderActions(v, isLoading, currentStatus)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-4 p-4">
        {localVehicles.map((v) => {
          const isLoading = loadingId === v.id;
          const currentStatus = (v.status ?? "在售") as VehicleStatus;
          const thumb = coverSrc(v);
          return (
            <div
              key={v.id}
              className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 ${isLoading ? "opacity-60" : ""}`}
            >
              <div className="flex gap-3 mb-3">
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={`${v.brand} ${v.model}`}
                      width={80}
                      height={56}
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
                  <p className="font-semibold text-[#1E293B] truncate">
                    {v.brand} {v.model}
                  </p>
                  <p className="text-xs text-slate-500 font-mono truncate">{v.id}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <VehicleStatusBadge status={currentStatus} />
                    <span className="text-xs text-slate-500">
                      {v.year} · ${v.fobPrice.toLocaleString()}
                    </span>
                  </div>
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
