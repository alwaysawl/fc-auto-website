"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  INQUIRY_PRIORITIES,
  INQUIRY_PRIORITY_LABELS,
  INQUIRY_SOURCES,
  INQUIRY_SOURCE_LABELS,
  type InquiryDuplicateMatch,
} from "@/lib/admin/inquiries/types";

const fieldCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/50";

type VehicleOption = { id: string; label: string };

export default function AdminInquiryForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<InquiryDuplicateMatch[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    whatsappNumber: "",
    email: "",
    customerCountry: "",
    customerCity: "",
    source: "manual",
    vehicleId: "",
    customerMessage: "",
    assignedContactName: "",
    nextFollowUpAt: "",
    requestedQuantity: "",
    destinationPortId: "",
    customerBudgetUsd: "",
    priority: "medium",
    intentScore: "",
    tags: "",
    autoAssign: true,
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/vehicles", { credentials: "include" });
        const json = await res.json();
        const list = Array.isArray(json?.vehicles)
          ? json.vehicles
          : Array.isArray(json)
            ? json
            : [];
        setVehicles(
          list.slice(0, 300).map(
            (v: {
              id: string;
              brand?: string;
              model?: string;
              titleEn?: string;
            }) => ({
              id: v.id,
              label:
                v.titleEn ||
                `${v.brand ?? ""} ${v.model ?? ""}`.trim() ||
                v.id,
            })
          )
        );
      } catch {
        // ignore — vehicle optional
      }
    })();
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(forceCreate = false) {
    setBusy(true);
    setError(null);
    setDuplicates([]);
    try {
      const payload = {
        customerName: form.customerName || null,
        whatsappNumber: form.whatsappNumber || null,
        email: form.email || null,
        customerCountry: form.customerCountry || null,
        customerCity: form.customerCity || null,
        source: form.source,
        vehicleId: form.vehicleId || null,
        customerMessage: form.customerMessage || null,
        assignedContactName: form.autoAssign
          ? null
          : form.assignedContactName || null,
        autoAssign: form.autoAssign,
        nextFollowUpAt: form.nextFollowUpAt
          ? new Date(form.nextFollowUpAt).toISOString()
          : null,
        requestedQuantity: form.requestedQuantity
          ? Number(form.requestedQuantity)
          : null,
        destinationPortId: form.destinationPortId || null,
        customerBudgetUsd: form.customerBudgetUsd
          ? Number(form.customerBudgetUsd)
          : null,
        priority: form.priority,
        intentScore: form.intentScore ? Number(form.intentScore) : 0,
        tags: form.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        forceCreate,
      };

      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 409 && Array.isArray(json.duplicates)) {
        setDuplicates(json.duplicates);
        setError(json.error || "发现可能重复的客户或询盘");
        return;
      }
      if (!res.ok) {
        setError(json.error || "询盘保存失败，请稍后重试");
        return;
      }
      router.push(`/admin/inquiries/${json.id}`);
      router.refresh();
    } catch {
      setError("询盘保存失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">新增询盘</h1>
          <p className="text-sm text-slate-500 mt-1">
            适合快速录入 WhatsApp / 社媒收到的线索，信息可不完整。
          </p>
        </div>
        <Link
          href="/admin/inquiries"
          className="text-sm font-medium text-slate-600 hover:text-[#1E293B]"
        >
          返回列表
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {duplicates.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-[#1E293B]">
            发现可能重复的客户或询盘
          </h2>
          <ul className="space-y-2">
            {duplicates.map((d) => (
              <li
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-50 pb-2 text-sm"
              >
                <div>
                  <p className="font-medium text-[#1E293B]">
                    {d.inquiryNumber} · {d.customerName || "未命名"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.statusLabel} · {d.reason} · 负责人{" "}
                    {d.assignedContactName || "—"}
                  </p>
                </div>
                <Link
                  href={`/admin/inquiries/${d.id}`}
                  className="text-xs font-semibold text-[#1E293B] underline"
                >
                  查看已有询盘
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit(true)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1E293B] hover:bg-slate-50"
          >
            仍然创建新询盘
          </button>
        </section>
      )}

      <form
        className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-slate-600">客户名称</span>
            <input
              className={fieldCls}
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">WhatsApp</span>
            <input
              className={fieldCls}
              value={form.whatsappNumber}
              onChange={(e) => setField("whatsappNumber", e.target.value)}
              placeholder="+237..."
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">客户国家</span>
            <input
              className={fieldCls}
              value={form.customerCountry}
              onChange={(e) => setField("customerCountry", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">来源</span>
            <select
              className={fieldCls}
              value={form.source}
              onChange={(e) => setField("source", e.target.value)}
            >
              {INQUIRY_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {INQUIRY_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">感兴趣车辆</span>
            <select
              className={fieldCls}
              value={form.vehicleId}
              onChange={(e) => setField("vehicleId", e.target.value)}
            >
              <option value="">不指定车辆</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">询盘内容</span>
            <textarea
              className={`${fieldCls} min-h-[96px]`}
              value={form.customerMessage}
              onChange={(e) => setField("customerMessage", e.target.value)}
            />
          </label>
          <div className="sm:col-span-2 space-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-[#1E293B]">
              <input
                type="checkbox"
                checked={form.autoAssign}
                onChange={(e) => setField("autoAssign", e.target.checked)}
              />
              按现有轮询自动分配负责人（Shawn ↔ Miles）
            </label>
            {!form.autoAssign && (
              <select
                className={fieldCls}
                value={form.assignedContactName}
                onChange={(e) => setField("assignedContactName", e.target.value)}
              >
                <option value="">选择负责人</option>
                <option value="Shawn">Shawn</option>
                <option value="Miles">Miles</option>
              </select>
            )}
          </div>
          <label className="block text-sm">
            <span className="text-slate-600">下次跟进时间</span>
            <input
              type="datetime-local"
              className={fieldCls}
              value={form.nextFollowUpAt}
              onChange={(e) => setField("nextFollowUpAt", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">优先级</span>
            <select
              className={fieldCls}
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
            >
              {INQUIRY_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {INQUIRY_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">数量（可选）</span>
            <input
              className={fieldCls}
              inputMode="numeric"
              value={form.requestedQuantity}
              onChange={(e) => setField("requestedQuantity", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">预算 USD（可选）</span>
            <input
              className={fieldCls}
              inputMode="decimal"
              value={form.customerBudgetUsd}
              onChange={(e) => setField("customerBudgetUsd", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">目的港 ID（可选）</span>
            <input
              className={fieldCls}
              value={form.destinationPortId}
              onChange={(e) => setField("destinationPortId", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">意向评分（可选，0–100）</span>
            <input
              className={fieldCls}
              inputMode="numeric"
              value={form.intentScore}
              onChange={(e) => setField("intentScore", e.target.value)}
              placeholder="留空则按线索自动建议"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">标签（逗号分隔）</span>
            <input
              className={fieldCls}
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">邮箱（可选）</span>
            <input
              className={fieldCls}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">城市（可选）</span>
            <input
              className={fieldCls}
              value={form.customerCity}
              onChange={(e) => setField("customerCity", e.target.value)}
            />
          </label>
        </div>

        <p className="text-xs text-slate-400">
          意向评分仅用于帮助排序，不代表一定成交。
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#1E293B] hover:brightness-95 disabled:opacity-60"
          >
            {busy ? "保存中…" : "保存询盘"}
          </button>
          <Link
            href="/admin/inquiries"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
