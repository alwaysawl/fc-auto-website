"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Locale, Vehicle } from "@/lib/types";
import { downloadVehicleQuotePdf } from "@/lib/vehicleQuote/buildQuotePdf";
import { shareOrSavePdfFile } from "@/lib/pdf/deliverPdfBlob";
import {
  INQUIRY_PRIORITIES,
  INQUIRY_PRIORITY_LABELS,
  INQUIRY_SOURCES,
  INQUIRY_SOURCE_LABELS,
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  type InquiryActivity,
  type InquiryDetail,
} from "@/lib/admin/inquiries/types";

const fieldCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#1E293B] [color-scheme:light] [-webkit-text-fill-color:#1E293B] opacity-100 placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8] outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/50";

function formatShanghai(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function activityLabel(type: string): string {
  const map: Record<string, string> = {
    inquiry_created: "创建询盘",
    note_added: "跟进记录",
    status_changed: "状态变更",
    priority_changed: "优先级变更",
    assigned: "分配负责人",
    reassigned: "重新分配",
    follow_up_scheduled: "设置跟进",
    contacted: "已联系",
    quotation_created: "创建报价",
    quotation_downloaded: "下载报价",
    marked_won: "标记成交",
    marked_lost: "标记流失",
    archived: "归档",
    unarchived: "取消归档",
    intent_changed: "意向评分",
    updated: "更新",
  };
  return map[type] || type;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  // Display in local browser time for datetime-local
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminInquiryDetailClient({
  initialInquiry,
  initialActivities,
}: {
  initialInquiry: InquiryDetail;
  initialActivities: InquiryActivity[];
}) {
  const [inquiry, setInquiry] = useState(initialInquiry);
  const [activities, setActivities] = useState(initialActivities);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [readyQuoteFile, setReadyQuoteFile] = useState<File | null>(null);

  // Switching inquiries must never reuse a previous quote PDF File.
  useEffect(() => {
    setReadyQuoteFile(null);
  }, [inquiry.id]);
  const [note, setNote] = useState("");
  const [form, setForm] = useState({
    customerName: initialInquiry.customerName || "",
    whatsappNumber: initialInquiry.whatsappNumber || "",
    email: initialInquiry.email || "",
    customerCountry: initialInquiry.customerCountry || "",
    customerCity: initialInquiry.customerCity || "",
    preferredLanguage: initialInquiry.preferredLanguage || "",
    source: initialInquiry.source,
    status: initialInquiry.status,
    priority: initialInquiry.priority,
    intentScore: String(initialInquiry.intentScore),
    assignedContactName: initialInquiry.assignedContactName || "",
    nextFollowUpAt: toDatetimeLocal(initialInquiry.nextFollowUpAt),
    requestedQuantity:
      initialInquiry.requestedQuantity != null
        ? String(initialInquiry.requestedQuantity)
        : "",
    customerBudgetUsd:
      initialInquiry.customerBudgetUsd != null
        ? String(initialInquiry.customerBudgetUsd)
        : "",
    destinationCountryId: initialInquiry.destinationCountryId || "",
    destinationPortId: initialInquiry.destinationPortId || "",
    customerMessage: initialInquiry.customerMessage || "",
    internalSummary: initialInquiry.internalSummary || "",
    lostReason: initialInquiry.lostReason || "",
    tags: (initialInquiry.tags || []).join(", "),
    reassignReason: "",
  });

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (res.ok && json.inquiry) {
      setInquiry(json.inquiry);
      setActivities(json.activities || []);
    }
  }, [inquiry.id]);

  async function savePatch(extra?: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const body = {
        customerName: form.customerName || null,
        whatsappNumber: form.whatsappNumber || null,
        email: form.email || null,
        customerCountry: form.customerCountry || null,
        customerCity: form.customerCity || null,
        preferredLanguage: form.preferredLanguage || null,
        source: form.source,
        status: form.status,
        priority: form.priority,
        intentScore: Number(form.intentScore) || 0,
        assignedContactName: form.assignedContactName || null,
        nextFollowUpAt: form.nextFollowUpAt
          ? new Date(form.nextFollowUpAt).toISOString()
          : null,
        requestedQuantity: form.requestedQuantity
          ? Number(form.requestedQuantity)
          : null,
        customerBudgetUsd: form.customerBudgetUsd
          ? Number(form.customerBudgetUsd)
          : null,
        destinationCountryId: form.destinationCountryId || null,
        destinationPortId: form.destinationPortId || null,
        customerMessage: form.customerMessage || null,
        internalSummary: form.internalSummary || null,
        lostReason: form.lostReason || null,
        tags: form.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        reassignReason: form.reassignReason || null,
        ...extra,
      };
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "询盘保存失败，请稍后重试");
        return;
      }
      setMsg(json.message || "询盘保存成功");
      await reload();
    } catch {
      setErr("询盘保存失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "跟进记录保存失败");
        return;
      }
      setMsg(json.message || "跟进记录已保存");
      setNote("");
      await reload();
    } catch {
      setErr("跟进记录保存失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  function openWhatsApp() {
    const phone = (inquiry.whatsappNumber || "").replace(/[^\d]/g, "");
    if (!phone) {
      setErr("该询盘没有 WhatsApp 号码");
      return;
    }
    const name = inquiry.customerName || "there";
    const contact = inquiry.assignedContactName || "FC Auto Export";
    const vehicle =
      inquiry.vehicleTitleSnapshot || inquiry.vehicle?.title || "your inquiry";
    const text = `Hello ${name}, this is ${contact} from FC Auto Export. I'm following up on your inquiry about ${vehicle}.`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function createQuote(event?: React.MouseEvent) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}/quote`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "创建报价失败");
        return;
      }
      const vehicle = json.vehicle as Vehicle;
      const locale = (json.locale || "en") as Locale;
      const delivery = await downloadVehicleQuotePdf(vehicle, locale, {
        contactName: json.contactName,
      });
      if (delivery.deliveryMethod === "ready") {
        setReadyQuoteFile(delivery.file);
        setMsg(delivery.deliveryMessage || "PDF 已生成，请点「分享或保存 PDF」");
      } else if (delivery.deliveryMethod === "share") {
        setMsg("已打开系统分享");
      } else {
        setMsg("报价已生成并下载");
      }
      await reload();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMsg("已取消分享");
      } else {
        setErr("创建报价失败，请稍后重试");
      }
    } finally {
      setBusy(false);
    }
  }

  async function shareReadyQuote(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!readyQuoteFile || busy) return;
    if (!readyQuoteFile.name || readyQuoteFile.size <= 0) {
      setReadyQuoteFile(null);
      setErr("PDF 无效，请重新创建报价");
      return;
    }
    setBusy(true);
    try {
      console.info("[AdminInquiryDetail] share quote", {
        filename: readyQuoteFile.name,
        size: readyQuoteFile.size,
        inquiryId: inquiry.id,
      });
      const result = await shareOrSavePdfFile(readyQuoteFile);
      setMsg(
        result.method === "share"
          ? `已打开系统分享\n${readyQuoteFile.name}`
          : `报价已开始下载\n${readyQuoteFile.name}`
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMsg("已取消分享");
      } else {
        setErr(err instanceof Error ? err.message : "分享失败，请重试");
      }
    } finally {
      setBusy(false);
    }
  }

  const waPreview = `Hello ${inquiry.customerName || "{customer_name}"}, this is ${
    inquiry.assignedContactName || "{assigned_contact}"
  } from FC Auto Export. I'm following up on your inquiry about ${
    inquiry.vehicleTitleSnapshot || inquiry.vehicle?.title || "{vehicle_title}"
  }.`;

  return (
    <div className="max-w-5xl space-y-5 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-mono text-slate-500">{inquiry.inquiryNumber}</p>
          <h1 className="text-2xl font-bold text-[#1E293B] mt-1">
            {inquiry.customerName || "未命名客户"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {INQUIRY_STATUS_LABELS[inquiry.status]} · 负责人{" "}
            {inquiry.assignedContactName || "未分配"}
            {inquiry.isOverdue && (
              <span className="ml-2 font-semibold text-red-700">已逾期</span>
            )}
          </p>
        </div>
        <Link
          href="/admin/inquiries"
          className="text-sm font-medium text-slate-600 hover:text-[#1E293B]"
        >
          返回列表
        </Link>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openWhatsApp}
          className="rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white"
        >
          WhatsApp 联系
        </button>
        {inquiry.email && (
          <a
            href={`mailto:${inquiry.email}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1E293B]"
          >
            发送邮件
          </a>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={(e) => void createQuote(e)}
          className="rounded-lg bg-[#FACC15] px-3 py-2 text-sm font-semibold text-[#1E293B]"
        >
          创建报价
        </button>
        {readyQuoteFile ? (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => void shareReadyQuote(e)}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
          >
            分享或保存 PDF
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setForm((f) => ({ ...f, status: "contacted" }));
            void savePatch({
              status: "contacted",
              lastContactedAt: new Date().toISOString(),
            });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          标记已联系
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("确认标记为已成交？不会自动改车辆为已售。")) return;
            setForm((f) => ({ ...f, status: "won" }));
            void savePatch({ status: "won" });
          }}
          className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-800"
        >
          标记成交
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("确认标记为已流失？")) return;
            const reason =
              form.lostReason || window.prompt("请填写流失原因") || "";
            if (!reason) return;
            setForm((f) => ({ ...f, status: "lost", lostReason: reason }));
            void savePatch({ status: "lost", lostReason: reason });
          }}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700"
        >
          标记流失
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("确认归档该询盘？")) return;
            void savePatch({ archive: true });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
        >
          归档询盘
        </button>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-700 mb-1">WhatsApp 消息预览（中文说明）</p>
        <p>管理员预览英文跟进模板：</p>
        <p className="mt-1 font-mono break-words">{waPreview}</p>
      </div>

      {inquiry.vehicle && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-3">关联车辆</h2>
          {!inquiry.vehicle.available && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              该车辆当前不可售，请确认替代车型。
            </p>
          )}
          <div className="flex gap-3">
            {inquiry.vehicle.coverUrl ? (
              <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={inquiry.vehicle.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-20 w-28 rounded-lg bg-slate-100 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-[#1E293B]">{inquiry.vehicle.title}</p>
              <p className="text-sm text-slate-600 mt-1">
                状态 {inquiry.vehicle.status || "—"} ·{" "}
                {inquiry.vehicle.priceLabel || "价格未填"}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs font-semibold">
                <a
                  href={`/en/inventory/${inquiry.vehicle.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1E293B] underline"
                >
                  网站详情
                </a>
                <Link
                  href={`/admin/vehicles/${inquiry.vehicle.id}/edit`}
                  className="text-[#1E293B] underline"
                >
                  后台编辑
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <form
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void savePatch();
        }}
      >
        <h2 className="text-sm font-semibold text-[#1E293B]">客户与需求</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600">客户名称</span>
            <input
              className={fieldCls}
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">WhatsApp</span>
            <input
              className={fieldCls}
              value={form.whatsappNumber}
              onChange={(e) =>
                setForm({ ...form, whatsappNumber: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">邮箱</span>
            <input
              className={fieldCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">国家</span>
            <input
              className={fieldCls}
              value={form.customerCountry}
              onChange={(e) =>
                setForm({ ...form, customerCountry: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">城市</span>
            <input
              className={fieldCls}
              value={form.customerCity}
              onChange={(e) => setForm({ ...form, customerCity: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">语言偏好</span>
            <input
              className={fieldCls}
              value={form.preferredLanguage}
              onChange={(e) =>
                setForm({ ...form, preferredLanguage: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">来源</span>
            <select
              className={fieldCls}
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as InquiryDetail["source"] })}
            >
              {INQUIRY_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {INQUIRY_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">数量</span>
            <input
              className={fieldCls}
              value={form.requestedQuantity}
              onChange={(e) =>
                setForm({ ...form, requestedQuantity: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">预算 USD</span>
            <input
              className={fieldCls}
              value={form.customerBudgetUsd}
              onChange={(e) =>
                setForm({ ...form, customerBudgetUsd: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">目的国 ID</span>
            <input
              className={fieldCls}
              value={form.destinationCountryId}
              onChange={(e) =>
                setForm({ ...form, destinationCountryId: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">目的港 ID</span>
            <input
              className={fieldCls}
              value={form.destinationPortId}
              onChange={(e) =>
                setForm({ ...form, destinationPortId: e.target.value })
              }
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">原始询盘内容</span>
            <textarea
              className={`${fieldCls} min-h-[80px]`}
              value={form.customerMessage}
              onChange={(e) =>
                setForm({ ...form, customerMessage: e.target.value })
              }
            />
          </label>
        </div>

        <h2 className="text-sm font-semibold text-[#1E293B] pt-2">管理字段</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600">状态</span>
            <select
              className={fieldCls}
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as InquiryDetail["status"],
                })
              }
            >
              {INQUIRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {INQUIRY_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">优先级</span>
            <select
              className={fieldCls}
              value={form.priority}
              onChange={(e) =>
                setForm({
                  ...form,
                  priority: e.target.value as InquiryDetail["priority"],
                })
              }
            >
              {INQUIRY_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {INQUIRY_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">意向评分（0–100）</span>
            <input
              className={fieldCls}
              value={form.intentScore}
              onChange={(e) => setForm({ ...form, intentScore: e.target.value })}
            />
            <span className="text-[11px] text-slate-400">
              建议分 {inquiry.suggestedIntentScore}（不会自动覆盖人工评分）·
              意向评分仅用于帮助排序，不代表一定成交。
            </span>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">负责人</span>
            <select
              className={fieldCls}
              value={form.assignedContactName}
              onChange={(e) =>
                setForm({ ...form, assignedContactName: e.target.value })
              }
            >
              <option value="">未分配</option>
              <option value="Shawn">Shawn</option>
              <option value="Miles">Miles</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">改派原因（可选）</span>
            <input
              className={fieldCls}
              value={form.reassignReason}
              onChange={(e) =>
                setForm({ ...form, reassignReason: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">下次跟进时间</span>
            <input
              type="datetime-local"
              className={fieldCls}
              value={form.nextFollowUpAt}
              onChange={(e) =>
                setForm({ ...form, nextFollowUpAt: e.target.value })
              }
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">流失/无效原因</span>
            <input
              className={fieldCls}
              value={form.lostReason}
              onChange={(e) => setForm({ ...form, lostReason: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">内部摘要</span>
            <textarea
              className={`${fieldCls} min-h-[64px]`}
              value={form.internalSummary}
              onChange={(e) =>
                setForm({ ...form, internalSummary: e.target.value })
              }
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">标签</span>
            <input
              className={fieldCls}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#1E293B] px-4 py-2.5 text-sm font-semibold text-[#FACC15] disabled:opacity-60"
        >
          {busy ? "保存中…" : "保存修改"}
        </button>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-[#1E293B]">添加跟进记录</h2>
        <textarea
          className={`${fieldCls} min-h-[80px]`}
          placeholder="例如：客户询问三台 RAV4；已发送报价；下周一再次联系"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || !note.trim()}
          onClick={() => void saveNote()}
          className="rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-[#1E293B] disabled:opacity-60"
        >
          保存跟进记录
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-3">跟进时间线</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-500">暂无跟进记录</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => (
              <li
                key={a.id}
                className="border-b border-slate-50 pb-3 last:border-0"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <p className="text-sm font-semibold text-[#1E293B]">
                    {activityLabel(a.activityType)}
                  </p>
                  <p className="text-xs text-slate-400 tabular-nums">
                    {formatShanghai(a.createdAt)}
                  </p>
                </div>
                {a.note && (
                  <p className="text-sm text-slate-700 mt-1 break-words">{a.note}</p>
                )}
                {(a.oldValue || a.newValue) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {a.oldValue || "—"} → {a.newValue || "—"}
                  </p>
                )}
                {a.actorName && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {a.actorName}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
