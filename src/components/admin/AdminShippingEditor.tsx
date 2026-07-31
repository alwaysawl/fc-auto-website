"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function parseFreight(value: string): number | null {
  if (value.trim() === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatUsdDisplay(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function countryOptionLabel(c: ShippingCountryWithPorts): string {
  const zh = c.name_zh?.trim();
  const en = c.name_en.trim();
  if (zh && en) return `${zh} / ${en}`;
  return zh || en || c.id;
}

function portOptionLabel(p: ShippingPortRow): string {
  const zh = p.name_zh?.trim();
  const en = p.name_en.trim();
  if (zh && en) return `${zh} / ${en}`;
  return zh || en || p.port_id;
}

function sortPorts(ports: ShippingPortRow[]): ShippingPortRow[] {
  return [...ports].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.name_en.localeCompare(b.name_en, "en", { sensitivity: "base" });
  });
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

function pickDefaultPortId(
  ports: ShippingPortRow[],
  preferredId: string
): string {
  if (preferredId && ports.some((p) => p.id === preferredId)) {
    return preferredId;
  }
  const firstEnabled = ports.find((p) => p.enabled);
  return firstEnabled?.id ?? ports[0]?.id ?? "";
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

type SavedFreightRow = {
  country: ShippingCountryWithPorts;
  port: ShippingPortRow;
};

function buildSavedFreightRows(
  list: ShippingCountryWithPorts[]
): SavedFreightRow[] {
  const rows: SavedFreightRow[] = [];
  for (const country of sortShippingCountries(list)) {
    for (const port of sortPorts(country.ports)) {
      if (port.single_vehicle_usd > 0 || port.container_40ft_usd > 0) {
        rows.push({ country, port });
      }
    }
  }
  return rows;
}

/** Explicit colors for Safari — body inherits light text-gray-200 onto white selects. */
const adminSelectClassName =
  "mt-1.5 w-full rounded-sm border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-[#1E293B] outline-none focus:border-gold focus:ring-2 focus:ring-gold [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 disabled:[-webkit-text-fill-color:#475569] disabled:opacity-100";

const adminSelectOptionClassName = "bg-white text-[#1E293B] opacity-100";

/** Explicit colors for Safari — number inputs inherit body text-gray-200 otherwise. */
const adminNumberInputClassName =
  "mt-1 w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] outline-none focus:border-gold focus:ring-2 focus:ring-gold [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 disabled:[-webkit-text-fill-color:#475569] disabled:opacity-100";

const adminNumberInputStyle = {
  color: "#1E293B",
  backgroundColor: "#ffffff",
  WebkitTextFillColor: "#1E293B",
  opacity: 1,
} as const;

const adminPriceTextClassName =
  "text-[#1E293B] font-semibold opacity-100 [-webkit-text-fill-color:#1E293B]";

const adminListActionClassName =
  "rounded-sm border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-[#1E293B] opacity-100 [-webkit-text-fill-color:#1E293B] hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 disabled:[-webkit-text-fill-color:#475569] disabled:opacity-100";

const adminListClearClassName =
  "rounded-sm border border-red-300 bg-white px-2.5 py-1.5 text-sm font-medium text-red-700 opacity-100 [-webkit-text-fill-color:#b91c1c] hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 disabled:[-webkit-text-fill-color:#475569] disabled:opacity-100";

const adminListActionStyle = {
  color: "#1E293B",
  backgroundColor: "#ffffff",
  WebkitTextFillColor: "#1E293B",
  opacity: 1,
} as const;

const adminListClearStyle = {
  color: "#b91c1c",
  backgroundColor: "#ffffff",
  WebkitTextFillColor: "#b91c1c",
  opacity: 1,
} as const;

function normalizeCountriesPayload(data: unknown): ShippingCountryWithPorts[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const raw = obj.countries ?? obj.data;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is ShippingCountryWithPorts =>
      !!row &&
      typeof row === "object" &&
      typeof (row as { id?: unknown }).id === "string"
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
  const [selectedPortId, setSelectedPortId] = useState(() => {
    const countryId = pickDefaultCountryId(initialList, "");
    const country = initialList.find((c) => c.id === countryId);
    return pickDefaultPortId(sortPorts(country?.ports ?? []), "");
  });

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
  const [resolvedProjectRef, setResolvedProjectRef] = useState(
    initial.resolvedProjectRef ?? null
  );
  const [countriesQueryErrorCode, setCountriesQueryErrorCode] = useState<
    string | null
  >(initial.countriesQueryErrorCode ?? null);
  const [countriesQueryErrorMessage, setCountriesQueryErrorMessage] = useState<
    string | null
  >(initial.countriesQueryErrorMessage ?? null);
  const [portsQueryErrorCode, setPortsQueryErrorCode] = useState<string | null>(
    initial.portsQueryErrorCode ?? null
  );
  const [portsQueryErrorMessage, setPortsQueryErrorMessage] = useState<
    string | null
  >(initial.portsQueryErrorMessage ?? null);
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

  const [editingPort, setEditingPort] = useState(false);
  const [portDrafts, setPortDrafts] = useState<Record<string, PortDraft>>(() =>
    buildDrafts(initialList)
  );
  const [savingPort, setSavingPort] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [showAddPort, setShowAddPort] = useState(false);
  const [newPort, setNewPort] = useState<NewPortForm>(emptyNewPort);

  const [listCountryFilter, setListCountryFilter] = useState("");
  const [listStatusFilter, setListStatusFilter] = useState<
    "all" | "enabled" | "disabled"
  >("all");
  const [listSearch, setListSearch] = useState("");
  const [clearTarget, setClearTarget] = useState<SavedFreightRow | null>(null);

  const freightFormRef = useRef<HTMLElement | null>(null);

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
        resolvedProjectRef?: string | null;
        countriesQueryErrorCode?: string | null;
        countriesQueryErrorMessage?: string | null;
        portsQueryErrorCode?: string | null;
        portsQueryErrorMessage?: string | null;
      },
      preferCountryId?: string,
      preferPortId?: string
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
      setResolvedProjectRef(meta.resolvedProjectRef ?? null);
      setCountriesQueryErrorCode(meta.countriesQueryErrorCode ?? null);
      setCountriesQueryErrorMessage(meta.countriesQueryErrorMessage ?? null);
      setPortsQueryErrorCode(meta.portsQueryErrorCode ?? null);
      setPortsQueryErrorMessage(meta.portsQueryErrorMessage ?? null);

      const nextCountryId = pickDefaultCountryId(
        sorted,
        preferCountryId ?? selectedCountryId
      );
      const nextCountry = sorted.find((c) => c.id === nextCountryId);
      const nextPorts = sortPorts(nextCountry?.ports ?? []);
      const nextPortId = pickDefaultPortId(
        nextPorts,
        preferPortId ?? selectedPortId
      );
      setSelectedCountryId(nextCountryId);
      setSelectedPortId(nextPortId);
    },
    [selectedCountryId, selectedPortId]
  );

  const load = useCallback(
    async (preferCountryId?: string, preferPortId?: string) => {
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
            resolvedProjectRef:
              typeof data.resolvedProjectRef === "string"
                ? data.resolvedProjectRef
                : typeof data.projectRef === "string"
                  ? data.projectRef
                  : null,
            countriesQueryErrorCode:
              typeof data.countriesQueryErrorCode === "string"
                ? data.countriesQueryErrorCode
                : null,
            countriesQueryErrorMessage:
              typeof data.countriesQueryErrorMessage === "string"
                ? data.countriesQueryErrorMessage
                : null,
            portsQueryErrorCode:
              typeof data.portsQueryErrorCode === "string"
                ? data.portsQueryErrorCode
                : null,
            portsQueryErrorMessage:
              typeof data.portsQueryErrorMessage === "string"
                ? data.portsQueryErrorMessage
                : null,
          },
          preferCountryId,
          preferPortId
        );
      } catch {
        showMsg("加载失败，请重试", false);
      } finally {
        setLoading(false);
      }
    },
    [applyList]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === selectedCountryId) ?? null,
    [countries, selectedCountryId]
  );

  const countryPorts = useMemo(
    () => sortPorts(selectedCountry?.ports ?? []),
    [selectedCountry]
  );

  const matchingPortCount = countryPorts.length;

  const selectedPort = useMemo(
    () => countryPorts.find((p) => p.id === selectedPortId) ?? null,
    [countryPorts, selectedPortId]
  );

  const selectedDraft = selectedPort
    ? portDrafts[selectedPort.id] ?? portToDraft(selectedPort)
    : null;

  const readOnly = source !== "database";

  const savedFreightRows = useMemo(
    () => buildSavedFreightRows(countries),
    [countries]
  );

  const filteredFreightRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return savedFreightRows.filter(({ country, port }) => {
      if (listCountryFilter && country.id !== listCountryFilter) return false;
      if (listStatusFilter === "enabled" && !port.enabled) return false;
      if (listStatusFilter === "disabled" && port.enabled) return false;
      if (!q) return true;
      const haystack = [
        country.name_zh ?? "",
        country.name_en,
        port.name_zh ?? "",
        port.name_en,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [savedFreightRows, listCountryFilter, listStatusFilter, listSearch]);

  const selectCountry = (countryId: string) => {
    setSelectedCountryId(countryId);
    setEditingCountry(false);
    setEditingPort(false);
    setShowAddPort(false);
    setGlobalMessage("");
    const country = countries.find((c) => c.id === countryId);
    const ports = sortPorts(country?.ports ?? []);
    setSelectedPortId(pickDefaultPortId(ports, ""));
  };

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
      await load(newId, "");
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
      await load(selectedCountry.id, selectedPortId);
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
      await load(selectedCountry.id, selectedPortId);
    } catch {
      showMsg("更新状态失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteCountry = async () => {
    if (!selectedCountry || busyKey || readOnly) return;
    const label = countryOptionLabel(selectedCountry);
    const n = selectedCountry.ports.length;
    const confirmMsg =
      n > 0
        ? `确认删除国家「${label}」？其下 ${n} 个港口及运费也将一并删除，此操作不可恢复。`
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
      setEditingPort(false);
      setShowAddPort(false);
      showMsg("国家已删除", true);
      await load("", "");
    } catch {
      showMsg("删除国家失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveFreight = async () => {
    if (!selectedPort || !selectedDraft || savingPort || readOnly) return;
    const single = parseFreight(selectedDraft.single_vehicle_usd);
    const container = parseFreight(selectedDraft.container_40ft_usd);
    if (single == null || container == null) {
      showMsg("运费必须为 0 或正数", false);
      return;
    }
    setSavingPort(true);
    try {
      const res = await fetch("/api/admin/shipping/ports", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPort.id,
          single_vehicle_usd: single,
          container_40ft_usd: container,
          enabled: selectedDraft.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "保存运费失败", false);
        return;
      }
      showMsg("运费保存成功", true);
      await load(selectedCountryId, selectedPort.id);
    } catch {
      showMsg("保存运费失败，请重试", false);
    } finally {
      setSavingPort(false);
    }
  };

  const handleSavePortMeta = async () => {
    if (!selectedPort || !selectedDraft || busyKey || readOnly) return;
    if (!selectedDraft.name_en.trim() && !selectedDraft.name_zh.trim()) {
      showMsg("港口名称不能为空", false);
      return;
    }
    setBusyKey("port-meta");
    try {
      const res = await fetch("/api/admin/shipping/ports", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPort.id,
          name_en: selectedDraft.name_en.trim() || selectedDraft.name_zh.trim(),
          name_zh: selectedDraft.name_zh.trim() || null,
          enabled: selectedDraft.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "保存港口失败", false);
        return;
      }
      setEditingPort(false);
      showMsg("港口已保存", true);
      await load(selectedCountryId, selectedPort.id);
    } catch {
      showMsg("保存港口失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const loadPortIntoForm = (countryId: string, portId: string) => {
    setSelectedCountryId(countryId);
    setSelectedPortId(portId);
    setEditingCountry(false);
    setEditingPort(false);
    setShowAddCountry(false);
    setShowAddPort(false);
    setGlobalMessage("");
    requestAnimationFrame(() => {
      freightFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const confirmAndClearFreight = (country: ShippingCountryWithPorts, port: ShippingPortRow) => {
    if (busyKey || readOnly) return;
    setClearTarget({ country, port });
  };

  const executeClearFreight = async () => {
    if (!clearTarget || busyKey || readOnly) return;
    const { country, port } = clearTarget;
    setBusyKey(`port-clear-${port.id}`);
    try {
      const res = await fetch("/api/admin/shipping/ports", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: port.id,
          single_vehicle_usd: 0,
          container_40ft_usd: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "清除运费失败", false);
        return;
      }
      setClearTarget(null);
      showMsg("运费已清除，港口仍保留", true);
      await load(country.id, port.id);
    } catch {
      showMsg("清除运费失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const confirmAndDeletePort = async (
    country: ShippingCountryWithPorts,
    port: ShippingPortRow
  ) => {
    if (busyKey || readOnly) return;
    const countryLabel = countryOptionLabel(country);
    const portLabel = portOptionLabel(port);
    const confirmed = window.confirm(
      `确定删除该港口吗？港口记录将永久删除，此操作不可恢复。\n\n国家：${countryLabel}\n港口：${portLabel}`
    );
    if (!confirmed) return;

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
      setEditingPort(false);
      showMsg("港口已删除", true);

      const remaining = sortPorts(
        (country.ports ?? []).filter((p) => p.id !== port.id)
      );
      const nextPortId =
        selectedPortId === port.id
          ? pickDefaultPortId(remaining, "")
          : selectedPortId;
      const keepCountryId =
        selectedCountryId === country.id ? country.id : selectedCountryId;
      await load(keepCountryId, nextPortId);
    } catch {
      showMsg("删除港口失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeletePort = async () => {
    if (!selectedCountry || !selectedPort) return;
    await confirmAndDeletePort(selectedCountry, selectedPort);
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
      const newPortId = data.port?.id as string | undefined;
      setNewPort(emptyNewPort());
      setShowAddPort(false);
      showMsg("港口已添加", true);
      await load(selectedCountry.id, newPortId);
    } catch {
      showMsg("添加港口失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const updateSelectedDraft = (patch: Partial<PortDraft>) => {
    if (!selectedPort) return;
    setPortDrafts((prev) => {
      const current = prev[selectedPort.id] ?? portToDraft(selectedPort);
      return {
        ...prev,
        [selectedPort.id]: { ...current, ...patch },
      };
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 font-mono break-all">
        诊断：国家 {countryCount} · 港口 {portCount} · 来源 {source}
        {selectedCountryId ? ` · 已选 ${selectedCountryId}` : ""}
        {selectedCountryId
          ? ` · 匹配港口 ${matchingPortCount}`
          : ""}
        {countriesQueryErrorCode
          ? ` · 国家错误 ${countriesQueryErrorCode}`
          : ""}
        {portsQueryErrorCode ? ` · 港口错误 ${portsQueryErrorCode}` : ""}
        {loading ? " · 刷新中…" : ""}
      </p>

      {(countriesQueryErrorMessage || portsQueryErrorMessage) && (
        <p className="text-xs text-red-600 break-all">
          查询错误：
          {[countriesQueryErrorMessage, portsQueryErrorMessage]
            .filter(Boolean)
            .join(" | ")}
        </p>
      )}
      {source === "error" && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          运费数据库查询失败（不是空表）。请查看上方诊断中的错误码，并确认服务器使用
          secret / service-role 密钥。
        </div>
      )}
      {portCount === 0 && countryCount > 0 && source === "database" && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          国家已加载，但 shipping_ports 返回 0
          行。请在 Supabase SQL Editor 执行已批准港口种子
          SQL（INSERT … ON CONFLICT，不覆盖已有非零运费）。
        </div>
      )}
      {countryCount === 0 && source === "database" && resolvedProjectRef && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          当前连接的 Supabase 项目中没有运费国家数据（项目{" "}
          <code className="rounded bg-amber-100 px-1">{resolvedProjectRef}</code>
          ）。
        </div>
      )}
      {readOnly && fallbackReason === "tables_missing" && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          运费数据表尚未创建，当前为静态示例数据（只读）。
        </div>
      )}
      {readOnly && fallbackReason === "client_unavailable" && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          无法连接运费数据库，当前为静态示例数据（只读）。
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

      {/* 1. Select country */}
      <section className="rounded-sm border border-gray-200 bg-white p-4 space-y-4">
        <label className="block text-sm max-w-md">
          <span className="font-medium text-[#1E293B]">选择国家</span>
          <select
            value={selectedCountryId}
            onChange={(e) => selectCountry(e.target.value)}
            className={adminSelectClassName}
          >
            {countries.length === 0 && (
              <option value="" className={adminSelectOptionClassName}>
                暂无国家，请先添加
              </option>
            )}
            {countries.map((c) => (
              <option
                key={c.id}
                value={c.id}
                className={adminSelectOptionClassName}
              >
                {countryOptionLabel(c)}
                {c.enabled ? "" : "（已停用）"}
              </option>
            ))}
          </select>
        </label>

        {/* 2. Current country heading */}
        {selectedCountry && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-slate-500">当前国家</p>
              <p className="text-lg font-semibold text-[#1E293B]">
                {countryOptionLabel(selectedCountry)}
              </p>
              {!selectedCountry.enabled && (
                <p className="text-xs text-amber-700 mt-0.5">
                  已停用（前台不显示）
                </p>
              )}
            </div>
          </div>
        )}

        {/* 3. Select port */}
        {selectedCountry && (
          <label className="block text-sm max-w-md">
            <span className="font-medium text-[#1E293B]">选择港口</span>
            <select
              value={selectedPortId}
              onChange={(e) => {
                setSelectedPortId(e.target.value);
                setEditingPort(false);
                setGlobalMessage("");
              }}
              disabled={countryPorts.length === 0}
              className={adminSelectClassName}
            >
              {countryPorts.length === 0 ? (
                <option value="" className={adminSelectOptionClassName}>
                  该国家暂无港口，请先添加港口。
                </option>
              ) : (
                countryPorts.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    className={adminSelectOptionClassName}
                  >
                    {portOptionLabel(p)}
                    {p.enabled ? "" : "（已停用）"}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
      </section>

      {/* 4–7. Selected port freight form */}
      {selectedCountry && countryPorts.length === 0 && (
        <p className="text-sm text-slate-500">
          {portCount === 0
            ? "数据库中尚无港口记录（全部国家均为 0）。请先执行港口种子 SQL，或在下方添加港口。"
            : "该国家暂无港口，请先添加港口。"}
        </p>
      )}

      {selectedPort && selectedDraft && (
        <section
          ref={freightFormRef}
          className="rounded-sm border border-gray-200 bg-white p-4 space-y-4"
        >
          <div>
            <p className="text-xs text-slate-500">当前港口</p>
            <p className="text-lg font-semibold text-[#1E293B]">
              {portOptionLabel(selectedPort)}
            </p>
            {!selectedDraft.enabled && (
              <p className="text-xs text-amber-700 mt-0.5">
                已停用（前台不显示）
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <label className="block text-sm">
              <span className="text-gray-600">1 辆运费（美元）</span>
              <input
                type="number"
                min={0}
                value={selectedDraft.single_vehicle_usd}
                disabled={readOnly || savingPort}
                onChange={(e) =>
                  updateSelectedDraft({ single_vehicle_usd: e.target.value })
                }
                className={adminNumberInputClassName}
                style={
                  readOnly || savingPort
                    ? {
                        color: "#475569",
                        backgroundColor: "#f1f5f9",
                        WebkitTextFillColor: "#475569",
                        opacity: 1,
                      }
                    : adminNumberInputStyle
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">2–4 辆整柜运费（美元）</span>
              <input
                type="number"
                min={0}
                value={selectedDraft.container_40ft_usd}
                disabled={readOnly || savingPort}
                onChange={(e) =>
                  updateSelectedDraft({ container_40ft_usd: e.target.value })
                }
                className={adminNumberInputClassName}
                style={
                  readOnly || savingPort
                    ? {
                        color: "#475569",
                        backgroundColor: "#f1f5f9",
                        WebkitTextFillColor: "#475569",
                        opacity: 1,
                      }
                    : adminNumberInputStyle
                }
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selectedDraft.enabled}
              disabled={readOnly || savingPort}
              onChange={(e) =>
                updateSelectedDraft({ enabled: e.target.checked })
              }
            />
            {selectedDraft.enabled ? "启用" : "停用"}
          </label>

          <div>
            <button
              type="button"
              disabled={readOnly || savingPort}
              onClick={() => void handleSaveFreight()}
              className="btn-primary disabled:opacity-50"
            >
              {savingPort ? "保存中…" : "保存运费"}
            </button>
          </div>
        </section>
      )}

      {/* Saved freight list */}
      <section className="rounded-sm border border-gray-200 bg-white p-4 space-y-4 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-[#1E293B]">已设置运费</h2>
          <p className="text-xs text-slate-500">
            共 {filteredFreightRows.length} 条
            {filteredFreightRows.length !== savedFreightRows.length
              ? `（筛选自 ${savedFreightRows.length}）`
              : ""}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm min-w-0">
            <span className="text-gray-600">国家筛选</span>
            <select
              value={listCountryFilter}
              onChange={(e) => setListCountryFilter(e.target.value)}
              className={adminSelectClassName}
            >
              <option value="" className={adminSelectOptionClassName}>
                全部国家
              </option>
              {sortShippingCountries(countries).map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  className={adminSelectOptionClassName}
                >
                  {countryOptionLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm min-w-0">
            <span className="text-gray-600">状态筛选</span>
            <select
              value={listStatusFilter}
              onChange={(e) =>
                setListStatusFilter(
                  e.target.value as "all" | "enabled" | "disabled"
                )
              }
              className={adminSelectClassName}
            >
              <option value="all" className={adminSelectOptionClassName}>
                全部
              </option>
              <option value="enabled" className={adminSelectOptionClassName}>
                启用
              </option>
              <option value="disabled" className={adminSelectOptionClassName}>
                停用
              </option>
            </select>
          </label>
          <label className="block text-sm min-w-0 sm:col-span-1">
            <span className="text-gray-600">搜索</span>
            <input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="国家或港口名称"
              className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
            />
          </label>
        </div>

        {filteredFreightRows.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">暂无已设置运费</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-slate-500">
                    <th className="py-2 pr-3 font-medium">国家</th>
                    <th className="py-2 pr-3 font-medium">港口</th>
                    <th className="py-2 pr-3 font-medium">1 辆运费</th>
                    <th className="py-2 pr-3 font-medium">2–4 辆整柜运费</th>
                    <th className="py-2 pr-3 font-medium">状态</th>
                    <th className="py-2 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFreightRows.map(({ country, port }) => (
                    <tr
                      key={port.id}
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="py-3 pr-3 text-[#1E293B]">
                        {countryOptionLabel(country)}
                      </td>
                      <td className="py-3 pr-3 text-[#1E293B]">
                        {portOptionLabel(port)}
                      </td>
                      <td
                        className={`py-3 pr-3 whitespace-nowrap ${adminPriceTextClassName}`}
                      >
                        {formatUsdDisplay(port.single_vehicle_usd)}
                      </td>
                      <td
                        className={`py-3 pr-3 whitespace-nowrap ${adminPriceTextClassName}`}
                      >
                        {formatUsdDisplay(port.container_40ft_usd)}
                      </td>
                      <td className="py-3 pr-3 text-[#1E293B] opacity-100">
                        {port.enabled ? "启用" : "停用"}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => loadPortIntoForm(country.id, port.id)}
                          className={`${adminListActionClassName} mr-2`}
                          style={adminListActionStyle}
                        >
                          修改
                        </button>
                        <button
                          type="button"
                          disabled={busyKey !== null || readOnly}
                          onClick={() =>
                            confirmAndClearFreight(country, port)
                          }
                          className={adminListClearClassName}
                          style={adminListClearStyle}
                        >
                          清除运费
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredFreightRows.map(({ country, port }) => (
                <div
                  key={port.id}
                  className="rounded-sm border border-gray-200 p-3 space-y-2 break-words"
                >
                  <div>
                    <p className="text-xs text-slate-500">国家</p>
                    <p className="font-medium text-[#1E293B]">
                      {countryOptionLabel(country)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">港口</p>
                    <p className="font-medium text-[#1E293B]">
                      {portOptionLabel(port)}
                    </p>
                  </div>
                  <p className={`text-sm ${adminPriceTextClassName}`}>
                    1 辆：{formatUsdDisplay(port.single_vehicle_usd)}
                  </p>
                  <p className={`text-sm ${adminPriceTextClassName}`}>
                    2–4 辆：{formatUsdDisplay(port.container_40ft_usd)}
                  </p>
                  <p className="text-sm text-[#1E293B] opacity-100">
                    状态：{port.enabled ? "启用" : "停用"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => loadPortIntoForm(country.id, port.id)}
                      className={adminListActionClassName}
                      style={adminListActionStyle}
                    >
                      修改
                    </button>
                    <button
                      type="button"
                      disabled={busyKey !== null || readOnly}
                      onClick={() => confirmAndClearFreight(country, port)}
                      className={adminListClearClassName}
                      style={adminListClearStyle}
                    >
                      清除运费
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Secondary actions */}
      {selectedCountry && (
        <section className="rounded-sm border border-dashed border-gray-300 bg-slate-50 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-[#1E293B]">管理操作</h3>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                setEditingCountry((v) => !v);
                setEditCountryEn(selectedCountry.name_en);
                setEditCountryZh(selectedCountry.name_zh ?? "");
                setShowAddCountry(false);
              }}
              className="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              {editingCountry ? "取消编辑国家" : "编辑国家"}
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                setShowAddCountry((v) => !v);
                setEditingCountry(false);
              }}
              className="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              {showAddCountry ? "取消添加国家" : "添加国家"}
            </button>
            <button
              type="button"
              disabled={busyKey !== null || readOnly}
              onClick={() => void handleToggleCountry()}
              className="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              {selectedCountry.enabled ? "停用国家" : "启用国家"}
            </button>
            <button
              type="button"
              disabled={busyKey !== null || readOnly}
              onClick={() => void handleDeleteCountry()}
              className="rounded-sm border border-red-200 bg-white px-3 py-2 text-sm text-red-600 disabled:opacity-50"
            >
              删除国家
            </button>
            {selectedPort && (
              <>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    setEditingPort((v) => !v);
                    setShowAddPort(false);
                  }}
                  className="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  {editingPort ? "取消编辑港口" : "编辑港口"}
                </button>
                <button
                  type="button"
                  disabled={busyKey !== null || readOnly}
                  onClick={() => void handleDeletePort()}
                  className="rounded-sm border border-red-200 bg-white px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                >
                  删除港口
                </button>
              </>
            )}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                setShowAddPort((v) => !v);
                setNewPort(emptyNewPort());
                setEditingPort(false);
              }}
              className="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              {showAddPort ? "取消添加港口" : "添加港口"}
            </button>
          </div>

          {editingCountry && (
            <div className="rounded-sm border border-gray-200 bg-white p-4 space-y-3 max-w-2xl">
              <p className="text-sm font-medium text-[#1E293B]">编辑国家</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-gray-600">中文名称</span>
                  <input
                    value={editCountryZh}
                    onChange={(e) => setEditCountryZh(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">英文名称</span>
                  <input
                    value={editCountryEn}
                    onChange={(e) => setEditCountryEn(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => void handleSaveCountry()}
                className="btn-primary disabled:opacity-50"
              >
                保存国家
              </button>
            </div>
          )}

          {showAddCountry && (
            <div className="rounded-sm border border-gray-200 bg-white p-4 space-y-3 max-w-2xl">
              <p className="text-sm font-medium text-[#1E293B]">添加国家</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-gray-600">中文名称</span>
                  <input
                    value={newCountryZh}
                    onChange={(e) => setNewCountryZh(e.target.value)}
                    disabled={addingCountry}
                    className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                    placeholder="贝宁"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">英文名称</span>
                  <input
                    value={newCountryEn}
                    onChange={(e) => setNewCountryEn(e.target.value)}
                    disabled={addingCountry}
                    className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                    placeholder="Benin"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={addingCountry}
                onClick={() => void handleAddCountry()}
                className="btn-primary disabled:opacity-50"
              >
                {addingCountry ? "添加中…" : "保存国家"}
              </button>
            </div>
          )}

          {editingPort && selectedPort && selectedDraft && (
            <div className="rounded-sm border border-gray-200 bg-white p-4 space-y-3 max-w-2xl">
              <p className="text-sm font-medium text-[#1E293B]">编辑港口</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-gray-600">港口中文名称</span>
                  <input
                    value={selectedDraft.name_zh}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelectedDraft({ name_zh: e.target.value })
                    }
                    className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">港口英文名称</span>
                  <input
                    value={selectedDraft.name_en}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelectedDraft({ name_en: e.target.value })
                    }
                    className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                  />
                </label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedDraft.enabled}
                  disabled={readOnly}
                  onChange={(e) =>
                    updateSelectedDraft({ enabled: e.target.checked })
                  }
                />
                {selectedDraft.enabled ? "启用" : "停用"}
              </label>
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => void handleSavePortMeta()}
                className="btn-primary disabled:opacity-50"
              >
                保存港口
              </button>
            </div>
          )}

          {showAddPort && selectedCountry && (
            <div className="rounded-sm border border-gray-200 bg-white p-4 space-y-3 max-w-2xl">
              <p className="text-sm font-medium text-[#1E293B]">添加港口</p>
              <p className="text-sm text-slate-600">
                将添加到：
                <span className="font-medium text-[#1E293B]">
                  {countryOptionLabel(selectedCountry)}
                </span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-gray-600">港口中文名称</span>
                  <input
                    value={newPort.name_zh}
                    onChange={(e) =>
                      setNewPort((p) => ({ ...p, name_zh: e.target.value }))
                    }
                    className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold"
                    placeholder="科托努"
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
                    placeholder="Cotonou"
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
                    className={adminNumberInputClassName}
                    style={adminNumberInputStyle}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">2–4 辆整柜运费（美元）</span>
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
                    className={adminNumberInputClassName}
                    style={adminNumberInputStyle}
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
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => void handleAddPort()}
                className="btn-primary disabled:opacity-50"
              >
                {busyKey === "port-add" ? "添加中…" : "保存"}
              </button>
            </div>
          )}
        </section>
      )}

      {clearTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-freight-title"
        >
          <div className="w-full max-w-md rounded-sm border border-gray-200 bg-white p-5 shadow-lg">
            <h2
              id="clear-freight-title"
              className="text-base font-semibold text-[#1E293B] opacity-100"
            >
              确定清除该港口的运费设置吗？
            </h2>
            <div className="mt-3 space-y-1 text-sm text-[#1E293B] opacity-100">
              <p>国家：{countryOptionLabel(clearTarget.country)}</p>
              <p>港口：{portOptionLabel(clearTarget.port)}</p>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => setClearTarget(null)}
                className={adminListActionClassName}
                style={adminListActionStyle}
              >
                取消
              </button>
              <button
                type="button"
                disabled={busyKey !== null || readOnly}
                onClick={() => void executeClearFreight()}
                className={adminListClearClassName}
                style={adminListClearStyle}
              >
                {busyKey?.startsWith("port-clear-") ? "清除中…" : "确认清除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
