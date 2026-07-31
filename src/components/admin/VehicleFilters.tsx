"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  const sort = searchParams.get("sort") ?? "newest";

  const [searchDraft, setSearchDraft] = useState(q);
  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchDraft === q) return;
      setParam("q", searchDraft.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchDraft, q, setParam]);

  const inputCls =
    "text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-transparent";

  const hasFilters = q || brand || year || status || featured || (sort && sort !== "newest");

  return (
    <div className="flex flex-wrap gap-3 items-center">
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
          placeholder="搜索标题、库存编号、品牌、车型…"
          value={searchDraft}
          className={`${inputCls} pl-9 w-56 sm:w-64`}
          onChange={(e) => setSearchDraft(e.target.value)}
        />
      </div>

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

      <select
        value={featured}
        onChange={(e) => setParam("featured", e.target.value)}
        className={inputCls}
      >
        <option value="">推荐/普通</option>
        <option value="1">推荐</option>
        <option value="0">普通</option>
      </select>

      <select
        value={sort}
        onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)}
        className={inputCls}
        aria-label="排序"
      >
        <option value="newest">最新更新</option>
        <option value="oldest">最早更新</option>
        <option value="price_asc">价格从低到高</option>
        <option value="price_desc">价格从高到低</option>
        <option value="year_desc">年份从新到旧</option>
        <option value="year_asc">年份从旧到新</option>
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-sm text-slate-500 hover:text-red-500 transition-colors"
        >
          清除筛选
        </button>
      )}
    </div>
  );
}
