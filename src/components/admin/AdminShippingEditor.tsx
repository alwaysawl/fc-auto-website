"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ShippingCountryWithPorts,
  ShippingPortRow,
} from "@/lib/shippingDestinations/types";

type PortDraft = {
  name_en: string;
  name_zh: string;
  single_vehicle_usd: string;
  container_40ft_usd: string;
};

function portToDraft(port: ShippingPortRow): PortDraft {
  return {
    name_en: port.name_en,
    name_zh: port.name_zh ?? "",
    single_vehicle_usd: String(port.single_vehicle_usd),
    container_40ft_usd: String(port.container_40ft_usd),
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

export default function AdminShippingEditor() {
  const [countries, setCountries] = useState<ShippingCountryWithPorts[]>([]);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [source, setSource] = useState<"database" | "static">("static");
  const [loading, setLoading] = useState(true);
  const [globalMessage, setGlobalMessage] = useState("");
  const [globalOk, setGlobalOk] = useState(false);

  const [newCountryEn, setNewCountryEn] = useState("");
  const [newCountryZh, setNewCountryZh] = useState("");
  const [addingCountry, setAddingCountry] = useState(false);

  const [portDrafts, setPortDrafts] = useState<Record<string, PortDraft>>({});
  const [savingPortId, setSavingPortId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [newPortByCountry, setNewPortByCountry] = useState<
    Record<
      string,
      {
        name_en: string;
        name_zh: string;
        single_vehicle_usd: string;
        container_40ft_usd: string;
      }
    >
  >({});

  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [editCountryEn, setEditCountryEn] = useState("");
  const [editCountryZh, setEditCountryZh] = useState("");

  const showMsg = (text: string, ok: boolean) => {
    setGlobalMessage(text);
    setGlobalOk(ok);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "加载失败", false);
        setCountries([]);
        return;
      }
      const list = (data.countries ?? []) as ShippingCountryWithPorts[];
      setCountries(list);
      setTablesMissing(Boolean(data.tablesMissing));
      setSource(data.source === "database" ? "database" : "static");
      const drafts: Record<string, PortDraft> = {};
      for (const c of list) {
        for (const p of c.ports) {
          drafts[p.id] = portToDraft(p);
        }
      }
      setPortDrafts(drafts);
    } catch {
      showMsg("加载失败，请重试", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddCountry = async () => {
    if (addingCountry) return;
    if (!newCountryEn.trim() && !newCountryZh.trim()) {
      showMsg("国家名称不能为空", false);
      return;
    }
    setAddingCountry(true);
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        method: "POST",
        credentials: "include",
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
      setNewCountryEn("");
      setNewCountryZh("");
      showMsg("国家已添加", true);
      await load();
    } catch {
      showMsg("添加国家失败，请重试", false);
    } finally {
      setAddingCountry(false);
    }
  };

  const handleSaveCountry = async (id: string) => {
    if (busyKey) return;
    if (!editCountryEn.trim() && !editCountryZh.trim()) {
      showMsg("国家名称不能为空", false);
      return;
    }
    setBusyKey(`country-save-${id}`);
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name_en: editCountryEn.trim() || editCountryZh.trim(),
          name_zh: editCountryZh.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "保存国家失败", false);
        return;
      }
      setEditingCountryId(null);
      showMsg("国家已保存", true);
      await load();
    } catch {
      showMsg("保存国家失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleCountry = async (country: ShippingCountryWithPorts) => {
    if (busyKey) return;
    setBusyKey(`country-toggle-${country.id}`);
    try {
      const res = await fetch("/api/admin/shipping/countries", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: country.id, enabled: !country.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "更新状态失败", false);
        return;
      }
      showMsg(country.enabled ? "国家已停用" : "国家已启用", true);
      await load();
    } catch {
      showMsg("更新状态失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteCountry = async (country: ShippingCountryWithPorts) => {
    if (busyKey) return;
    const label = country.name_zh || country.name_en;
    if (
      !window.confirm(
        `确认删除国家「${label}」？其下所有港口与运费也将一并删除。`
      )
    ) {
      return;
    }
    setBusyKey(`country-del-${country.id}`);
    try {
      const res = await fetch(
        `/api/admin/shipping/countries?id=${encodeURIComponent(country.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "删除国家失败", false);
        return;
      }
      showMsg("国家已删除", true);
      await load();
    } catch {
      showMsg("删除国家失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSavePort = async (port: ShippingPortRow) => {
    if (savingPortId) return;
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: port.id,
          name_en: draft.name_en.trim() || draft.name_zh.trim(),
          name_zh: draft.name_zh.trim() || null,
          single_vehicle_usd: single,
          container_40ft_usd: container,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "保存运费失败", false);
        return;
      }
      showMsg("运费已保存", true);
      await load();
    } catch {
      showMsg("保存运费失败，请重试", false);
    } finally {
      setSavingPortId(null);
    }
  };

  const handleTogglePort = async (port: ShippingPortRow) => {
    if (busyKey) return;
    setBusyKey(`port-toggle-${port.id}`);
    try {
      const res = await fetch("/api/admin/shipping/ports", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: port.id, enabled: !port.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "更新港口状态失败", false);
        return;
      }
      showMsg(port.enabled ? "港口已停用" : "港口已启用", true);
      await load();
    } catch {
      showMsg("更新港口状态失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeletePort = async (port: ShippingPortRow) => {
    if (busyKey) return;
    const label = port.name_zh || port.name_en;
    if (!window.confirm(`确认删除港口「${label}」及其运费记录？`)) return;
    setBusyKey(`port-del-${port.id}`);
    try {
      const res = await fetch(
        `/api/admin/shipping/ports?id=${encodeURIComponent(port.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "删除港口失败", false);
        return;
      }
      showMsg("港口已删除", true);
      await load();
    } catch {
      showMsg("删除港口失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddPort = async (countryId: string) => {
    if (busyKey) return;
    const form = newPortByCountry[countryId] ?? {
      name_en: "",
      name_zh: "",
      single_vehicle_usd: "0",
      container_40ft_usd: "0",
    };
    if (!form.name_en.trim() && !form.name_zh.trim()) {
      showMsg("港口名称不能为空", false);
      return;
    }
    const single = parseFreight(form.single_vehicle_usd);
    const container = parseFreight(form.container_40ft_usd);
    if (single == null || container == null) {
      showMsg("运费必须为 0 或正数", false);
      return;
    }
    setBusyKey(`port-add-${countryId}`);
    try {
      const res = await fetch("/api/admin/shipping/ports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_id: countryId,
          name_en: form.name_en.trim() || form.name_zh.trim(),
          name_zh: form.name_zh.trim() || null,
          single_vehicle_usd: single,
          container_40ft_usd: container,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.error || "添加港口失败", false);
        return;
      }
      setNewPortByCountry((prev) => ({
        ...prev,
        [countryId]: {
          name_en: "",
          name_zh: "",
          single_vehicle_usd: "0",
          container_40ft_usd: "0",
        },
      }));
      showMsg("港口已添加", true);
      await load();
    } catch {
      showMsg("添加港口失败，请重试", false);
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">加载中…</p>;
  }

  return (
    <div className="space-y-8">
      {tablesMissing && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">运费数据表尚未创建</p>
          <p className="mt-1">
            当前显示的是静态示例数据（只读）。请在 Supabase SQL 编辑器执行迁移文件
            <code className="mx-1 rounded bg-amber-100 px-1">
              supabase/migrations/20260731_shipping_countries_ports.sql
            </code>
            后再管理运费。来源：{source}
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

      <section className="rounded-sm border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-base font-semibold text-[#1E293B]">添加国家</h2>
        <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
          <label className="block text-sm">
            <span className="text-gray-600">英文名称</span>
            <input
              value={newCountryEn}
              onChange={(e) => setNewCountryEn(e.target.value)}
              disabled={tablesMissing || addingCountry}
              className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
              placeholder="Cameroon"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">中文名称</span>
            <input
              value={newCountryZh}
              onChange={(e) => setNewCountryZh(e.target.value)}
              disabled={tablesMissing || addingCountry}
              className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
              placeholder="喀麦隆"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void handleAddCountry()}
          disabled={tablesMissing || addingCountry}
          className="btn-primary disabled:opacity-50"
        >
          {addingCountry ? "添加中…" : "添加国家"}
        </button>
      </section>

      {countries.length === 0 ? (
        <p className="text-sm text-slate-500">暂无运费记录</p>
      ) : (
        <div className="space-y-6">
          {countries.map((country) => {
            const countryLabel = country.name_zh
              ? `${country.name_en} / ${country.name_zh}`
              : country.name_en;
            const newPort = newPortByCountry[country.id] ?? {
              name_en: "",
              name_zh: "",
              single_vehicle_usd: "0",
              container_40ft_usd: "0",
            };

            return (
              <section
                key={country.id}
                className={`rounded-sm border bg-white overflow-hidden ${
                  country.enabled ? "border-gray-200" : "border-gray-300 opacity-80"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 bg-charcoal px-4 py-3 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">
                      国家
                    </p>
                    {editingCountryId === country.id ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        <input
                          value={editCountryEn}
                          onChange={(e) => setEditCountryEn(e.target.value)}
                          className="rounded-sm border border-white/30 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/50"
                          placeholder="英文"
                        />
                        <input
                          value={editCountryZh}
                          onChange={(e) => setEditCountryZh(e.target.value)}
                          className="rounded-sm border border-white/30 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/50"
                          placeholder="中文"
                        />
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold">{countryLabel}</h3>
                    )}
                    {!country.enabled && (
                      <p className="text-xs text-amber-200 mt-0.5">已停用（前台不显示）</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingCountryId === country.id ? (
                      <>
                        <button
                          type="button"
                          disabled={busyKey !== null || tablesMissing}
                          onClick={() => void handleSaveCountry(country.id)}
                          className="rounded-sm bg-gold px-3 py-1.5 text-sm font-medium text-charcoal disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCountryId(null)}
                          className="rounded-sm border border-white/40 px-3 py-1.5 text-sm"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={tablesMissing}
                        onClick={() => {
                          setEditingCountryId(country.id);
                          setEditCountryEn(country.name_en);
                          setEditCountryZh(country.name_zh ?? "");
                        }}
                        className="rounded-sm border border-white/40 px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        编辑
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyKey !== null || tablesMissing}
                      onClick={() => void handleToggleCountry(country)}
                      className="rounded-sm border border-white/40 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      {country.enabled ? "停用" : "启用"}
                    </button>
                    <button
                      type="button"
                      disabled={busyKey !== null || tablesMissing}
                      onClick={() => void handleDeleteCountry(country)}
                      className="rounded-sm border border-red-300/60 px-3 py-1.5 text-sm text-red-200 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {country.ports.length === 0 ? (
                    <p className="text-sm text-slate-500">暂无港口</p>
                  ) : (
                    <div className="space-y-4">
                      {country.ports.map((port) => {
                        const draft = portDrafts[port.id] ?? portToDraft(port);
                        const portLabel = port.name_zh
                          ? `${port.name_en} / ${port.name_zh}`
                          : port.name_en;
                        const saving = savingPortId === port.id;

                        return (
                          <div
                            key={port.id}
                            className={`rounded-sm border p-4 space-y-3 ${
                              port.enabled
                                ? "border-gray-200"
                                : "border-dashed border-gray-300 bg-gray-50"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-xs text-gray-500">港口</p>
                                <p className="font-medium text-[#1E293B]">
                                  {portLabel}
                                </p>
                                {!port.enabled && (
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    已停用（前台不显示）
                                  </p>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                当前：1 辆 {formatUsdDisplay(port.single_vehicle_usd)} ·
                                2–4 辆 {formatUsdDisplay(port.container_40ft_usd)}
                              </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <label className="block text-sm">
                                <span className="text-gray-600">港口名称（英文）</span>
                                <input
                                  value={draft.name_en}
                                  disabled={tablesMissing || saving}
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
                                <span className="text-gray-600">港口名称（中文）</span>
                                <input
                                  value={draft.name_zh}
                                  disabled={tablesMissing || saving}
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
                                <span className="text-gray-600">
                                  1 辆运费（美元）
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={draft.single_vehicle_usd}
                                  disabled={tablesMissing || saving}
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
                                  step={1}
                                  value={draft.container_40ft_usd}
                                  disabled={tablesMissing || saving}
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

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={tablesMissing || saving}
                                onClick={() => void handleSavePort(port)}
                                className="btn-primary disabled:opacity-50"
                              >
                                {saving ? "保存中…" : "保存运费"}
                              </button>
                              <button
                                type="button"
                                disabled={busyKey !== null || tablesMissing}
                                onClick={() => void handleTogglePort(port)}
                                className="rounded-sm border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                              >
                                {port.enabled ? "停用" : "启用"}
                              </button>
                              <button
                                type="button"
                                disabled={busyKey !== null || tablesMissing}
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

                  <div className="rounded-sm border border-dashed border-gray-300 p-4 space-y-3">
                    <h4 className="text-sm font-medium text-[#1E293B]">
                      添加港口
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block text-sm">
                        <span className="text-gray-600">港口名称（英文）</span>
                        <input
                          value={newPort.name_en}
                          disabled={tablesMissing || busyKey !== null}
                          onChange={(e) =>
                            setNewPortByCountry((prev) => ({
                              ...prev,
                              [country.id]: {
                                ...newPort,
                                name_en: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
                          placeholder="Douala"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-gray-600">港口名称（中文）</span>
                        <input
                          value={newPort.name_zh}
                          disabled={tablesMissing || busyKey !== null}
                          onChange={(e) =>
                            setNewPortByCountry((prev) => ({
                              ...prev,
                              [country.id]: {
                                ...newPort,
                                name_zh: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
                          placeholder="杜阿拉"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-gray-600">1 辆运费（美元）</span>
                        <input
                          type="number"
                          min={0}
                          value={newPort.single_vehicle_usd}
                          disabled={tablesMissing || busyKey !== null}
                          onChange={(e) =>
                            setNewPortByCountry((prev) => ({
                              ...prev,
                              [country.id]: {
                                ...newPort,
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
                          value={newPort.container_40ft_usd}
                          disabled={tablesMissing || busyKey !== null}
                          onChange={(e) =>
                            setNewPortByCountry((prev) => ({
                              ...prev,
                              [country.id]: {
                                ...newPort,
                                container_40ft_usd: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-sm border border-gray-300 px-3 py-2 outline-none focus:border-gold focus:ring-2 focus:ring-gold disabled:bg-gray-50"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={tablesMissing || busyKey !== null}
                      onClick={() => void handleAddPort(country.id)}
                      className="btn-primary disabled:opacity-50"
                    >
                      添加港口
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="rounded-sm border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-2">
        <p>
          <strong>计费说明（购物车，未改动）：</strong>
          1 辆使用单车运费；2–4 辆使用整柜运费；5 辆及以上按每 4 辆一组整柜，余数按既有规则（余 1
          加单车，余 2–3 再加一整柜）。
        </p>
        <p>
          「客户使用自有货代」仍只显示 FOB，不计算运费。加纳 / 尼日利亚在购物车中仍排除。
        </p>
      </div>
    </div>
  );
}
