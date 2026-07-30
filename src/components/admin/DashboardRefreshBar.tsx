"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function DashboardRefreshBar() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  useEffect(() => {
    setLastRefreshed(
      new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, []);

  function refresh() {
    startTransition(() => {
      router.refresh();
      setLastRefreshed(
        new Date().toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-[#1E293B] hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        <svg
          className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {isPending ? "刷新中…" : "刷新数据"}
      </button>
      {lastRefreshed && (
        <span className="text-xs text-slate-500">
          上次刷新：{lastRefreshed}
        </span>
      )}
    </div>
  );
}
