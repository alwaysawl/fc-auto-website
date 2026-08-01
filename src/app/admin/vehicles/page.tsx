import Link from "next/link";
import { Suspense } from "react";
import { dbGetAllVehicles } from "@/lib/supabase/vehicle-queries";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import VehicleManagementTable from "@/components/admin/VehicleManagementTable";
import VehicleFilters from "@/components/admin/VehicleFilters";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminErrorState from "@/components/admin/AdminErrorState";

const PAGE_SIZE = 20;

interface SearchParams {
  q?: string;
  brand?: string;
  year?: string;
  status?: string;
  featured?: string;
  sort?: string;
  page?: string;
}

function filterVehicles(vehicles: Vehicle[], params: SearchParams): Vehicle[] {
  let result = [...vehicles];

  if (params.q) {
    const q = params.q.toLowerCase();
    result = result.filter(
      (v) =>
        v.id.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.titleEn ?? "").toLowerCase().includes(q)
    );
  }

  if (params.brand) {
    result = result.filter((v) => v.brand === params.brand);
  }

  if (params.year) {
    result = result.filter((v) => String(v.year) === params.year);
  }

  if (params.status) {
    result = result.filter((v) => (v.status ?? "在售") === params.status);
  }

  if (params.featured === "1") {
    result = result.filter((v) => v.featured);
  } else if (params.featured === "0") {
    result = result.filter((v) => !v.featured);
  }

  return result;
}

function sortVehicles(vehicles: Vehicle[], sort: string | undefined): Vehicle[] {
  const list = [...vehicles];
  const time = (v: Vehicle) =>
    new Date(v.updatedAt || v.createdAt || 0).getTime();

  switch (sort) {
    case "oldest":
      return list.sort((a, b) => time(a) - time(b));
    case "price_asc":
      return list.sort((a, b) => a.fobPrice - b.fobPrice);
    case "price_desc":
      return list.sort((a, b) => b.fobPrice - a.fobPrice);
    case "year_asc":
      return list.sort((a, b) => a.year - b.year);
    case "year_desc":
      return list.sort((a, b) => b.year - a.year);
    case "newest":
    default:
      return list.sort((a, b) => time(b) - time(a));
  }
}

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  let allVehicles: Vehicle[] = [];
  let loadError = false;

  try {
    allVehicles = await dbGetAllVehicles();
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div>
        <PageHeader count={0} />
        <AdminErrorState />
      </div>
    );
  }

  const filtered = sortVehicles(filterVehicles(allVehicles, params), params.sort);
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const brands = [...new Set(allVehicles.map((v) => v.brand))].sort();
  const years = [...new Set(allVehicles.map((v) => v.year))].sort((a, b) => b - a);

  const statusCounts: Record<string, number> = {};
  for (const v of allVehicles) {
    const s = v.status ?? "在售";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  return (
    <div className="max-w-screen-xl">
      <PageHeader count={allVehicles.length} />

      <div className="flex flex-wrap gap-2 mb-6">
        {(["在售", "草稿", "已售", "已下架"] as VehicleStatus[]).map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 shadow-sm"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                s === "在售"
                  ? "bg-emerald-500"
                  : s === "草稿"
                    ? "bg-amber-400"
                    : s === "已售"
                      ? "bg-slate-400"
                      : "bg-red-400"
              }`}
            />
            {s}
            <span className="font-bold text-[#1E293B]">{statusCounts[s] ?? 0}</span>
          </span>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <Suspense fallback={<div className="text-sm text-slate-400">加载筛选器…</div>}>
          <VehicleFilters brands={brands} years={years} />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            共 <strong className="text-[#1E293B]">{total}</strong> 条记录
            {total !== allVehicles.length && `（已筛选，共 ${allVehicles.length} 辆）`}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">
              第 {page} / {totalPages} 页
            </span>
          )}
        </div>

        {paginated.length === 0 ? (
          <AdminEmptyState
            title="没有符合条件的车辆"
            description="请尝试调整筛选条件"
          />
        ) : (
          <VehicleManagementTable vehicles={paginated} locale="en" />
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} params={params} />
        )}
      </div>
    </div>
  );
}

function PageHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">车辆管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          共 {count} 辆车辆 · 管理在售、草稿和历史车辆
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/homepage-featured"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-[#1E293B] text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          ⭐ 首页推荐排序
        </Link>
        <Link
          href="/admin/vehicles/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FACC15] text-[#1E293B] text-sm font-semibold rounded-lg hover:bg-yellow-300 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加车辆
        </Link>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: SearchParams;
}) {
  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.brand) sp.set("brand", params.brand);
    if (params.year) sp.set("year", params.year);
    if (params.status) sp.set("status", params.status);
    if (params.featured) sp.set("featured", params.featured);
    if (params.sort) sp.set("sort", params.sort);
    sp.set("page", String(p));
    return `/admin/vehicles?${sp.toString()}`;
  };

  return (
    <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
      <Link
        href={buildHref(page - 1)}
        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
          page <= 1
            ? "pointer-events-none opacity-30 border-slate-200 text-slate-400"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        上一页
      </Link>
      <span className="text-sm text-slate-500">
        第 {page} / {totalPages} 页
      </span>
      <Link
        href={buildHref(page + 1)}
        className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
          page >= totalPages
            ? "pointer-events-none opacity-30 border-slate-200 text-slate-400"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        下一页
      </Link>
    </div>
  );
}
