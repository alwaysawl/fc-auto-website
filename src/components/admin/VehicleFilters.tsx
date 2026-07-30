"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface VehicleFiltersProps {
  brands: string[];
  years: number[];
}

export default function VehicleFilters({ brands, years }: VehicleFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page on filter change
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const q = searchParams.get("q") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const year = searchParams.get("year") ?? "";
  const status = searchParams.get("status") ?? "";
  const featured = searchParams.get("featured") ?? "";

  const inputCls =
    "text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-transparent";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
          />
        </svg>
        <input
          type="search"
          placeholder="搜索库存编号、品牌、车型…"
          defaultValue={q}
          className={`${inputCls} pl-9 w-56`}
          onChange={(e) => setParam("q", e.target.value)}
        />
      </div>

      {/* Brand */}
      <select
        value={brand}
        onChange={(e) => setParam("brand", e.target.value)}
        className={inputCls}
      >
        <option value="">全部品牌</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      {/* Year */}
      <select
        value={year}
        onChange={(e) => setParam("year", e.target.value)}
        className={inputCls}
      >
        <option value="">全部年份</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={status}
        onChange={(e) => setParam("status", e.target.value)}
        className={inputCls}
      >
        <option value="">全部状态</option>
        <option value="在售">在售</option>
        <option value="已售">已售</option>
        <option value="草稿">草稿</option>
        <option value="已下架">已下架</option>
      </select>

      {/* Featured */}
      <select
        value={featured}
        onChange={(e) => setParam("featured", e.target.value)}
        className={inputCls}
      >
        <option value="">推荐/普通</option>
        <option value="1">推荐</option>
        <option value="0">普通</option>
      </select>

      {/* Clear filters */}
      {(q || brand || year || status || featured) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-slate-500 hover:text-red-500 transition-colors"
        >
          清除筛选
        </button>
      )}
    </div>
  );
}
