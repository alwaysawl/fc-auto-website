"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ShippingCountryWithPorts,
  ShippingListResult,
  ShippingPortRow,
} from "@/lib/shippingDestinations/types";
import { sortShippingCountries } from "@/lib/shippingDestinations/sortCountries";

type PortDraft = {
  name_en: string;
  name_zh: string;
  single_vehicle_usd: string;
  container_40ft_usd: string;
  enabled: boolean;
};

type NewPortForm = {
  name_en: string;
  name_zh: string;
  single_vehicle_usd: string;
  container_40ft_usd: string;
  enabled: boolean;
};

const emptyNewPort = (): NewPortForm => ({
  name_en: "",
  name_zh: "",
  single_vehicle_usd: "0",
  container_40ft_usd: "0",
  enabled: true,
});

function portToDraft(port: ShippingPortRow): PortDraft {
  return {
    name_en: port.name_en,
    name_zh: port.name_zh ?? "",
    single_vehicle_usd: String(port.single_vehicle_usd),
    container_40ft_usd: String(port.container_40ft_usd),
    enabled: port.enabled,
  };
}

function formatUsdDisplay(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseFreight(value: string): number | null {
  if (value.trim() === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function countryOptionLabel(c: ShippingCountryWithPorts): string {
  const zh = c.name_zh?.trim();
  const en = c.name_en.trim();
  if (zh && en) return `${zh} / ${en}`;
  return zh || en || c.id;
}

function countryTitle(c: ShippingCountryWithPorts): string {
  return countryOptionLabel(c);
}

function pickDefaultCountryId(
  list: ShippingCountryWithPorts[],
  preferredId: string
): string {
  if (preferredId && list.some((c) => c.id === preferredId)) {
    return preferredId;
  }
  const firstEnabled = list.find((c) => c.enabled);
  return firstEnabled?.id ?? list[0]?.id ?? "";
}

function buildDrafts(list: ShippingCountryWithPorts[]): Record<string, PortDraft> {
  const drafts: Record<string, PortDraft> = {};
  for (const c of list) {
    for (const p of c.ports) {
      drafts[p.id] = portToDraft(p);
    }
  }
  return drafts;
}

function normalizeCountriesPayload(data: unknown): ShippingCountryWithPorts[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const raw = obj.countries ?? obj.data;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is ShippingCountryWithPorts =>
      !!row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string"
  );
}

type Props = {
  initial: ShippingListResult;
};

export default function AdminShippingEditor({ initial }: Props) {
  const initialList = useMemo(
    () => sortShippingCountries(initial.countries ?? []),
    [initial.countries]
  );

  const [countries, setCountries] = useState<ShippingCountryWithPorts[]>(initialList);
  const [selectedCountryId, setSelectedCountryId] = useState(() =>
    pickDefaultCountryId(initialList, "")
  );
  const [tablesMissing, setTablesMissing] = useState(initial.tablesMissing);
  const [fallbackReason, setFallbackReason] = useState<
    "tables_missing" | "client_unavailable" | null
  >(initial.fallbackReason);
  const [source, setSource] = useState<"database" | "static" | "error">(
    initial.source
  );
  const [countryCount, setCountryCount] = useState(
    initial.countryCount ?? initialList.length
  );
  const [portCount, setPortCount] = useState(
    initial.portCount ??
      initialList.reduce((sum, c) => sum + (c.ports?.length ?? 0), 0)
  );
  const [serverProjectRef, setServerProjectRef] = useState(
    initial.serverProjectRef ?? null
  );
  const [publicProjectRef, setPublicProjectRef] = useState(
    initial.publicProjectRef ?? null
  );
  const [resolvedProjectRef, setResolvedProjectRef] = useState(
    initial.resolvedProjectRef ?? null
  );
  const [urlMismatch, setUrlMismatch] = useState(Boolean(initial.urlMismatch));
  const [keyTypeUsed, setKeyTypeUsed] = useState(initial.keyTypeUsed ?? "missing");
  const [countriesQueryErrorCode, setCountriesQueryErrorCode] = useState<
    string | null
  >(initial.countriesQueryErrorCode ?? null);
  const [countriesQueryErrorMessage, setCountriesQueryErrorMessage] = useState<
    string | null
  >(initial.countriesQueryErrorMessage ?? null);
  const [loading, setLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState("");
  const [globalOk, setGlobalOk] = useState(false);

  const [showAddCountry, setShowAddCountry] = useState(false);
  const [newCountryEn, setNewCountryEn] = useState("");
  const [newCountryZh, setNewCountryZh] = useState("");
  const [addingCountry, setAddingCountry] = useState(false);

  const [editingCountry, setEditingCountry] = useState(false);
  const [editCountryEn, setEditCountryEn] = useState("");
  const [editCountryZh, setEditCountryZh] = useState("");

  const [portDrafts, setPortDrafts] = useState<Record<string, PortDraft>>(() =>
    buildDrafts(initialList)
  );
  const [savingPortId, setSavingPortId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [showAddPort, setShowAddPort] = useState(false);
  const [newPort, setNewPort] = useState<NewPortForm>(emptyNewPort);

  const showMsg = (text: string, ok: boolean) => {
    setGlobalMessage(text);
    setGlobalOk(ok);
  };

  const applyList = useCallback(
    (
      list: ShippingCountryWithPorts[],
      meta: {
        source: "database" | "static" | "error";
        tablesMissing: boolean;
        fallbackReason: "tables_missing" | "client_unavailable" | null;
        countryCount?: number;
        portCount?: number;
        serverProjectRef?: string | null;
        publicProjectRef?: string | null;
        resolvedProjectRef?: string | null;
        urlMismatch?: boolean;
        keyTypeUsed?: "secret" | "service-role" | "anon" | "missing";
        countriesQueryErrorCode?: string | null;
        countriesQueryErrorMessage?: string | null;
      },
      preferCountryId?: string
    ) => {
      const sorted = sortShippingCountries(list);
      setCountries(sorted);
      setPortDrafts(buildDrafts(sorted));
      setSource(meta.source);
      setTablesMissing(meta.tablesMissing);
      setFallbackReason(meta.fallbackReason);
      setCountryCount(meta.countryCount ?? sorted.length);
      setPortCount(
        meta.portCount ??
          sorted.reduce((sum, c) => sum + (c.ports?.length ?? 0), 0)
      );
      setServerProjectRef(meta.serverProjectRef ?? null);
      setPublicProjectRef(meta.publicProjectRef ?? null);
      setResolvedProjectRef(meta.resolvedProjectRef ?? null);
      setUrlMismatch(Boolean(meta.urlMismatch));
      setKeyTypeUsed(meta.keyTypeUsed ?? "missing");
      setCountriesQueryErrorCode(meta.countriesQueryErrorCode ?? null);
      setCountriesQueryErrorMessage(meta.countriesQueryErrorMessage ?? null);
      setSelectedCountryId((prev) =>
        pickDefaultCountryId(sorted, preferCountryId ?? prev)
      );
    },
    []
  );

  const load = useCallback(
    async (preferCountryId?: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/shipping/countries", {
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        const data = await res.json();
        if (!res.ok) {
          showMsg(data.error || "加载失败", false);
          // Keep SSR / previous countries — do not wipe to empty on refresh failure
          return;
        }
        const list = normalizeCountriesPayload(data);
        applyList(
          list,
          {
            source:
              data.source === "database" || data.source === "error"
                ? data.source
                : "static",
            tablesMissing: Boolean(data.tablesMissing),
            fallbackReason:
              data.fallbackReason === "tables_missing" ||
              data.fallbackReason === "client_unavailable"
                ? data.fallbackReason
                : data.tablesMissing
                  ? "tables_missing"
                  : null,
            countryCount:
              typeof data.countryCount === "number"
                ? data.countryCount
                : list.length,
            portCount:
              typeof data.portCount === "number"
                ? data.portCount
                : list.reduce((sum, c) => sum + (c.ports?.length ?? 0), 0),
            serverProjectRef:
              typeof data.serverProjectRef === "string"
                ? data.serverProjectRef
                : null,
            publicProjectRef:
              typeof data.publicProjectRef === "string"
                ? data.publicProjectRef
                : null,
            resolvedProjectRef:
              typeof data.resolvedProjectRef === "string"
                ? data.resolvedProjectRef
                : typeof data.projectRef === "string"
                  ? data.projectRef
                  : null,
            urlMismatch: Boolean(data.urlMismatch),
            keyTypeUsed:
              data.keyTypeUsed === "secret" ||
              data.keyTypeUsed === "service-role" ||
              data.keyTypeUsed === "anon" ||
              data.keyTypeUsed === "missing"
                ? data.keyTypeUsed
                : "missing",
            countriesQueryErrorCode:
              typeof data.countriesQueryErrorCode === "string"
                ? data.countriesQueryErrorCode
                : null,
            countriesQueryErrorMessage:
              typeof data.countriesQueryErrorMessage === "string"
                ? data.countriesQueryErrorMessage
                : null,
          },
          preferCountryId
        );
      } catch {
        showMsg("加载失败，请重试", false);
      } finally {
        setLoading(false);
      }
    },
    [applyList]
  );

  // Soft refresh after mount (no-store) so client picks up latest DB without wiping SSR
  useEffect(() => {
    void load();
  }, [load]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === selectedCountryId) ?? null,
    [countries, selectedCountryId]
  );

  const selectedPorts = selectedCountry?.ports ?? [];
  const readOnly = source !== "database";

  const handleAddCountry = async () => {
    if (addingCountry || readOnly) return;
    if (!newCountryEn.trim() && !newCountryZh.trim()) {
      showMsg("国家名称不能为空", false);
      return;
    }
    setAddingCountry(true);
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: newCountryEn.trim() || newCountryZh.trim(),
          name_zh: newCountryZh.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "添加国家失败", false);
        return;
      }
      const newId = data.country?.id as string | undefined;
      setNewCountryEn("");
      setNewCountryZh("");
      setShowAddCountry(false);
      showMsg("国家已添加", true);
      await load(newId);
    } catch {
      showMsg("添加国家失败，请重试", false);
    } finally {
      setAddingCountry(false);
    }
  };

  const handleSaveCountry = async () => {
    if (!selectedCountry || busyKey || readOnly) return;
    if (!editCountryEn.trim() && !editCountryZh.trim()) {
      showMsg("国家名称不能为空", false);
      return;
    }
    setBusyKey("country-save");
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCountry.id,
          name_en: editCountryEn.trim() || editCountryZh.trim(),
          name_zh: editCountryZh.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "保存国家失败", false);
        return;
      }
      setEditingCountry(false);
      showMsg("国家已保存", true);
      await load(selectedCountry.id);
    } catch {
      showMsg("保存国家失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleCountry = async () => {
    if (!selectedCountry || busyKey || readOnly) return;
    setBusyKey("country-toggle");
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCountry.id,
          enabled: !selectedCountry.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "更新状态失败", false);
        return;
      }
      showMsg(selectedCountry.enabled ? "国家已停用" : "国家已启用", true);
      await load(selectedCountry.id);
    } catch {
      showMsg("更新状态失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteCountry = async () => {
    if (!selectedCountry || busyKey || readOnly) return;
    const label = countryTitle(selectedCountry);
    const portCountForCountry = selectedCountry.ports.length;
    const confirmMsg =
      portCountForCountry > 0
        ? `确认删除国家「${label}」？其下 ${portCountForCountry} 个港口及运费也将一并删除，此操作不可恢复。`
        : `确认删除国家「${label}」？`;
    if (!window.confirm(confirmMsg)) return;

    setBusyKey("country-del");
    try {
      const res = await fetch(
        `/api/admin/shipping/countries?id=${encodeURIComponent(selectedCountry.id)}`,
        { method: "DELETE", credentials: "include", cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "删除国家失败", false);
        return;
      }
      setEditingCountry(false);
      setShowAddPort(false);
      showMsg("国家已删除", true);
      await load("");
    } catch {
      showMsg("删除国家失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSavePort = async (port: ShippingPortRow) => {
    if (savingPortId || readOnly) return;
    const draft = portDrafts[port.id];
    if (!draft) return;
    if (!draft.name_en.trim() && !draft.name_zh.trim()) {
      showMsg("港口名称不能为空", false);
      return;
    }
    const single = parseFreight(draft.single_vehicle_usd);
    const container = parseFreight(draft.container_40ft_usd);
    if (single == null || container == null) {
      showMsg("运费必须为 0 或正数", false);
      return;
    }
    setSavingPortId(port.id);
    try {
      const res = await fetch("/api/admin/shipping/ports", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: port.id,
          name_en: draft.name_en.trim() || draft.name_zh.trim(),
          name_zh: draft.name_zh.trim() || null,
          single_vehicle_usd: single,
          container_40ft_usd: container,
          enabled: draft.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "保存失败", false);
        return;
      }
      showMsg("运费已保存", true);
      await load(selectedCountryId);
    } catch {
      showMsg("保存失败，请重试", false);
    } finally {
      setSavingPortId(null);
    }
  };

  const handleDeletePort = async (port: ShippingPortRow) => {
    if (busyKey || readOnly) return;
    const label = port.name_zh || port.name_en;
    if (!window.confirm(`确认删除港口「${label}」及其运费记录？`)) return;
    setBusyKey(`port-del-${port.id}`);
    try {
      const res = await fetch(
        `/api/admin/shipping/ports?id=${encodeURIComponent(port.id)}`,
        { method: "DELETE", credentials: "include", cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "删除港口失败", false);
        return;
      }
      showMsg("港口已删除", true);
      await load(selectedCountryId);
    } catch {
      showMsg("删除港口失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddPort = async () => {
    if (!selectedCountry || busyKey || readOnly) return;
    if (!newPort.name_en.trim() && !newPort.name_zh.trim()) {
      showMsg("港口名称不能为空", false);
      return;
    }
    const single = parseFreight(newPort.single_vehicle_usd);
    const container = parseFreight(newPort.container_40ft_usd);
    if (single == null || container == null) {
      showMsg("运费必须为 0 或正数", false);
      return;
    }
    setBusyKey("port-add");
    try {
      const res = await fetch("/api/admin/shipping/ports", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_id: selectedCountry.id,
          name_en: newPort.name_en.trim() || newPort.name_zh.trim(),
          name_zh: newPort.name_zh.trim() || null,
          single_vehicle_usd: single,
          container_40ft_usd: container,
          enabled: newPort.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "添加港口失败", false);
        return;
      }
      setNewPort(emptyNewPort());
      setShowAddPort(false);
      showMsg("港口已添加", true);
      await load(selectedCountry.id);
    } catch {
      showMsg("添加港口失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 font-mono break-all">
        诊断：国家 {countryCount} · 港口 {portCount} · 来源 {source}
        {selectedCountryId ? ` · 已选 ${selectedCountryId}` : ""}
        {resolvedProjectRef ? ` · 项目 ${resolvedProjectRef}` : ""}
        {` · 密钥 ${keyTypeUsed}`}
        {countriesQueryErrorCode
          ? ` · 国家错误 ${countriesQueryErrorCode}`
          : ""}
        {urlMismatch
          ? ` · URL不一致(server=${serverProjectRef ?? "?"} public=${publicProjectRef ?? "?"})`
          : ""}
        {loading ? " · 刷新中…" : ""}
      </p>
      {countriesQueryErrorMessage && (
        <p className="text-xs text-red-600 break-all">
          查询错误：{countriesQueryErrorMessage}
        </p>
      )}
      {source === "error" && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          运费数据库查询失败（不是空表）。请查看上方诊断中的错误码，并确认服务器使用
          secret / service-role 密钥。
        </div>
      )}
      {countryCount === 0 && source === "database" && resolvedProjectRef && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">当前连接的 Supabase 项目中没有运费国家数据</p>
          <p className="mt-1">
            网站正在查询项目{" "}
            <code className="rounded bg-amber-100 px-1">{resolvedProjectRef}</code>
            （密钥类型：{keyTypeUsed}）。SQL Editor 能看到行、但接口为 0
            时，通常是 API
            密钥未绕过 RLS（车辆表有公开读策略仍可显示，运费表仅 service_role
            可见）。请确认 Vercel 使用有效的{" "}
            <code className="rounded bg-amber-100 px-1">SUPABASE_SECRET_KEY</code>{" "}
            （sb_secret…）或可用的 service_role JWT，且不要把 anon/publishable
            填进密钥变量。
          </p>
        </div>
      )}

      {readOnly && fallbackReason === "tables_missing" && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">运费数据表尚未创建</p>
          <p className="mt-1">
            当前显示的是静态示例数据（只读）。请先在 Supabase 执行迁移后再管理运费。来源：
            {source}
          </p>
        </div>
      )}
      {readOnly && fallbackReason === "client_unavailable" && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">无法连接运费数据库</p>
          <p className="mt-1">
            当前显示的是静态示例数据（只读）。请检查服务器数据库配置。来源：
            {source}
          </p>
        </div>
      )}

      {globalMessage && (
        <p
          className={`text-sm ${globalOk ? "text-green-600" : "text-red-600"}`}
          role="status"
        >
          {globalMessage}
        </p>
      )}

      <section className="rounded-sm border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block text-sm min-w-[16rem] flex-1 max-w-md">
            <span className="font-medium text-[#1E293B]">选择国家</span>
            <select
              value={selectedCountryId}
              onChange={(e) => {
                setSelectedCountryId(e.target.value);
                setEditingCountry(false);
                setShowAddPort(false);
                setGlobalMessage("");
              }}
              className="mt-1.5 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
            >
              {countries.length === 0 && (
                <option value="">暂无国家，请先添加</option>
              )}
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {countryOptionLabel(c)}
                  {c.enabled ? "" : "（已停用）"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              setShowAddCountry((v) => !v);
              setGlobalMessage("");
            }}
            className="rounded-sm border border-gray-300 px-4 py-2.5 text-sm font-medium text-[#1E293B] hover:bg-gray-50 disabled:opacity-50"
          >
            {showAddCountry ? "取消添加国家" : "添加国家"}
          </button>
        </div>

        {showAddCountry && (
          <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#1E293B]">添加国家</h3>
            <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
              <label className="block text-sm">
                <span className="text-gray-600">中文名称</span>
                <input
                  value={newCountryZh}
                  onChange={(e) => setNewCountryZh(e.target.value)}
                  disabled={addingCountry}
                  className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                  placeholder="喀麦隆"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">英文名称</span>
                <input
                  value={newCountryEn}
                  onChange={(e) => setNewCountryEn(e.target.value)}
                  disabled={addingCountry}
                  className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                  placeholder="Cameroon"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void handleAddCountry()}
              disabled={addingCountry}
              className="btn-primary disabled:opacity-50"
            >
              {addingCountry ? "添加中…" : "保存国家"}
            </button>
          </div>
        )}
      </section>

      {!selectedCountry ? (
        <p className="text-sm text-slate-500">
          {countries.length === 0
            ? "暂无国家，请先添加"
            : "请选择国家以查看港口"}
        </p>
      ) : (
        <section className="rounded-sm border border-gray-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 bg-charcoal px-4 py-4 text-white">
            <div>
              <p className="text-xs text-white/70">当前国家</p>
              {editingCountry ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={editCountryZh}
                    onChange={(e) => setEditCountryZh(e.target.value)}
                    className="rounded-sm border border-white/30 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/50"
                    placeholder="中文名称"
                  />
                  <input
                    value={editCountryEn}
                    onChange={(e) => setEditCountryEn(e.target.value)}
                    className="rounded-sm border border-white/30 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/50"
                    placeholder="英文名称"
                  />
                </div>
              ) : (
                <h2 className="text-xl font-semibold mt-0.5">
                  {countryTitle(selectedCountry)}
                </h2>
              )}
              {!selectedCountry.enabled && (
                <p className="text-xs text-amber-200 mt-1">
                  已停用（前台不显示）
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {editingCountry ? (
                <>
                  <button
                    type="button"
                    disabled={busyKey !== null || readOnly}
                    onClick={() => void handleSaveCountry()}
                    className="rounded-sm bg-gold px-3 py-1.5 text-sm font-medium text-charcoal disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCountry(false)}
                    className="rounded-sm border border-white/40 px-3 py-1.5 text-sm"
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    setEditingCountry(true);
                    setEditCountryEn(selectedCountry.name_en);
                    setEditCountryZh(selectedCountry.name_zh ?? "");
                  }}
                  className="rounded-sm border border-white/40 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  编辑国家
                </button>
              )}
              <button
                type="button"
                disabled={busyKey !== null || readOnly}
                onClick={() => void handleToggleCountry()}
                className="rounded-sm border border-white/40 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {selectedCountry.enabled ? "停用" : "启用"}
              </button>
              <button
                type="button"
                disabled={busyKey !== null || readOnly}
                onClick={() => void handleDeleteCountry()}
                className="rounded-sm border border-red-300/60 px-3 py-1.5 text-sm text-red-200 disabled:opacity-50"
              >
                删除
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[#1E293B]">
                港口列表
              </h3>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  setShowAddPort((v) => !v);
                  setNewPort(emptyNewPort());
                }}
                className="btn-primary disabled:opacity-50"
              >
                {showAddPort ? "取消添加港口" : "添加港口"}
              </button>
            </div>

            {showAddPort && (
              <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
                <p className="text-sm text-slate-600">
                  将添加到：
                  <span className="font-medium text-[#1E293B]">
                    {countryTitle(selectedCountry)}
                  </span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block text-sm">
                    <span className="text-gray-600">港口中文名称</span>
                    <input
                      value={newPort.name_zh}
                      onChange={(e) =>
                        setNewPort((p) => ({ ...p, name_zh: e.target.value }))
                      }
                      className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                      placeholder="杜阿拉"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600">港口英文名称</span>
                    <input
                      value={newPort.name_en}
                      onChange={(e) =>
                        setNewPort((p) => ({ ...p, name_en: e.target.value }))
                      }
                      className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                      placeholder="Douala"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600">1 辆运费（美元）</span>
                    <input
                      type="number"
                      min={0}
                      value={newPort.single_vehicle_usd}
                      onChange={(e) =>
                        setNewPort((p) => ({
                          ...p,
                          single_vehicle_usd: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600">
                      2–4 辆整柜运费（美元）
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={newPort.container_40ft_usd}
                      onChange={(e) =>
                        setNewPort((p) => ({
                          ...p,
                          container_40ft_usd: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                    />
                  </label>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newPort.enabled}
                    onChange={(e) =>
                      setNewPort((p) => ({ ...p, enabled: e.target.checked }))
                    }
                  />
                  启用
                </label>
                <div>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => void handleAddPort()}
                    className="btn-primary disabled:opacity-50"
                  >
                    {busyKey === "port-add" ? "添加中…" : "保存"}
                  </button>
                </div>
              </div>
            )}

            {selectedPorts.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                该国家暂无港口，请添加港口。
              </p>
            ) : (
              <div className="space-y-4">
                {selectedPorts.map((port) => {
                  const draft = portDrafts[port.id] ?? portToDraft(port);
                  const saving = savingPortId === port.id;
                  return (
                    <div
                      key={port.id}
                      className={`rounded-sm border p-4 space-y-3 ${
                        draft.enabled
                          ? "border-gray-200"
                          : "border-dashed border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[#1E293B]">
                          {port.name_zh || port.name_en}
                          {port.name_zh && port.name_en
                            ? ` / ${port.name_en}`
                            : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                          当前：1 辆 {formatUsdDisplay(port.single_vehicle_usd)}{" "}
                          · 2–4 辆 {formatUsdDisplay(port.container_40ft_usd)}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block text-sm">
                          <span className="text-gray-600">港口中文名称</span>
                          <input
                            value={draft.name_zh}
                            disabled={readOnly || saving}
                            onChange={(e) =>
                              setPortDrafts((prev) => ({
                                ...prev,
                                [port.id]: {
                                  ...draft,
                                  name_zh: e.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-600">港口英文名称</span>
                          <input
                            value={draft.name_en}
                            disabled={readOnly || saving}
                            onChange={(e) =>
                              setPortDrafts((prev) => ({
                                ...prev,
                                [port.id]: {
                                  ...draft,
                                  name_en: e.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-600">
                            1 辆运费（美元）
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={draft.single_vehicle_usd}
                            disabled={readOnly || saving}
                            onChange={(e) =>
                              setPortDrafts((prev) => ({
                                ...prev,
                                [port.id]: {
                                  ...draft,
                                  single_vehicle_usd: e.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-gray-600">
                            2–4 辆整柜运费（美元）
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={draft.container_40ft_usd}
                            disabled={readOnly || saving}
                            onChange={(e) =>
                              setPortDrafts((prev) => ({
                                ...prev,
                                [port.id]: {
                                  ...draft,
                                  container_40ft_usd: e.target.value,
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            disabled={readOnly || saving}
                            onChange={(e) =>
                              setPortDrafts((prev) => ({
                                ...prev,
                                [port.id]: {
                                  ...draft,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                          />
                          {draft.enabled ? "启用" : "停用"}
                        </label>
                        <button
                          type="button"
                          disabled={readOnly || saving}
                          onClick={() => void handleSavePort(port)}
                          className="btn-primary disabled:opacity-50"
                        >
                          {saving ? "保存中…" : "保存"}
                        </button>
                        <button
                          type="button"
                          disabled={busyKey !== null || readOnly}
                          onClick={() => void handleDeletePort(port)}
                          className="rounded-sm border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
