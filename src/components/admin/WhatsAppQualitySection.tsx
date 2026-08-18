"use client";

import { useState } from "react";
import {
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  deriveWhatsAppQuality,
  resolveActualContact,
  type CustomerType,
  type LeadStage,
  type WhatsAppQualityDashboard,
  type WhatsAppQualityLead,
} from "@/lib/admin/whatsapp-quality-types";

function formatShanghaiDate(iso: string): string {
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

function FunnelStage({
  label,
  count,
  max,
  unit,
}: {
  label: string;
  count: number;
  max: number;
  unit: string;
}) {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const width =
    safeCount > 0
      ? Math.min(100, Math.max((safeCount / safeMax) * 100, 4))
      : 0;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="tabular-nums text-sm font-semibold text-slate-900">
          {safeCount}
          {unit}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#1E293B]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function QualityLeadCard({
  lead,
  busy,
  onChange,
}: {
  lead: WhatsAppQualityLead;
  busy: boolean;
  onChange: (
    id: string,
    patch: { customerType?: CustomerType; leadStage?: LeadStage }
  ) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-900 break-all">
            {lead.inquiryId || "—"}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-slate-600">
            {formatShanghaiDate(lead.createdAt)}
          </p>
        </div>
        <p className="text-xs text-slate-600 flex-shrink-0">
          {lead.assignedContact || "未分配"}
        </p>
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-700 sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">来源</dt>
          <dd className="font-medium text-slate-800">{lead.sourceLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500">入口</dt>
          <dd className="font-medium text-slate-800">{lead.entry}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-slate-500">车型</dt>
          <dd className="font-medium text-slate-800 truncate">
            {lead.vehicleTitle || "—"}
          </dd>
        </div>
      </dl>
      {!lead.linkedToAnalytics ? (
        <p className="mt-2 text-[11px] text-slate-500">
          此条为旧记录或未写入 Inquiry ID，来源无法自动关联。
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          客户类型
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
            value={lead.customerType}
            disabled={busy}
            onChange={(e) =>
              onChange(lead.id, {
                customerType: e.target.value as CustomerType,
              })
            }
          >
            {CUSTOMER_TYPES.map((value) => (
              <option key={value} value={value}>
                {CUSTOMER_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          销售阶段
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
            value={lead.leadStage}
            disabled={busy}
            onChange={(e) =>
              onChange(lead.id, { leadStage: e.target.value as LeadStage })
            }
          >
            {LEAD_STAGES.map((value) => (
              <option key={value} value={value}>
                {LEAD_STAGE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

export default function WhatsAppQualitySection({
  data,
  onLeadsChange,
}: {
  data: WhatsAppQualityDashboard;
  onLeadsChange: (next: WhatsAppQualityDashboard) => void;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const funnelMax = Math.max(data.funnel.uniqueVisitors, data.funnel.whatsappInquiries, 1);

  async function patchLead(
    id: string,
    patch: { customerType?: CustomerType; leadStage?: LeadStage }
  ) {
    const previous = data;
    const optimisticLeads = data.leads.map((row) => {
      if (row.id !== id) return row;
      const leadStage = patch.leadStage ?? row.leadStage;
      return {
        ...row,
        customerType: patch.customerType ?? row.customerType,
        leadStage,
        actualContact: resolveActualContact(leadStage, row.actualContact),
      };
    });
    const optimisticDerived = deriveWhatsAppQuality(
      optimisticLeads,
      data.funnel.uniqueVisitors
    );
    onLeadsChange({
      ...data,
      leads: optimisticLeads,
      funnel: optimisticDerived.funnel,
      sourceQuality: optimisticDerived.sourceQuality,
    });

    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales-assignments/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        lead?: WhatsAppQualityLead;
        error?: string;
      };
      if (!res.ok || !json.lead) {
        onLeadsChange(previous);
        setError(json.error || "保存失败，请稍后重试");
        return;
      }
      const leads = optimisticLeads.map((row) =>
        row.id === json.lead!.id ? json.lead! : row
      );
      const derived = deriveWhatsAppQuality(
        leads,
        data.funnel.uniqueVisitors
      );
      onLeadsChange({
        ...data,
        leads,
        funnel: derived.funnel,
        sourceQuality: derived.sourceQuality,
      });
    } catch {
      onLeadsChange(previous);
      setError("保存失败，请稍后重试");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
        <h2 className="text-base font-semibold text-slate-900">真实业务漏斗</h2>
        <p className="mt-1 text-xs text-slate-600">
          独立访客来自网站访问。WhatsApp 点击及之后按 Inquiry ID 去重，未人工标记的旧点击不会算作成交客户。
        </p>
        {!data.available ? (
          <p className="mt-3 text-sm text-slate-600">
            {data.error || "该统计项暂无可用数据来源"}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <FunnelStage
              label="独立访客"
              count={data.funnel.uniqueVisitors}
              max={funnelMax}
              unit="人"
            />
            <FunnelStage
              label="WhatsApp 点击"
              count={data.funnel.whatsappInquiries}
              max={funnelMax}
              unit="个"
            />
            <FunnelStage
              label="实际联系"
              count={data.funnel.actualContact}
              max={funnelMax}
              unit="个"
            />
            <FunnelStage
              label="车商"
              count={data.funnel.dealers}
              max={funnelMax}
              unit="个"
            />
            <FunnelStage
              label="有采购意向"
              count={data.funnel.interested}
              max={funnelMax}
              unit="个"
            />
            <FunnelStage
              label="已报价"
              count={data.funnel.quoted}
              max={funnelMax}
              unit="个"
            />
            <FunnelStage
              label="已成交"
              count={data.funnel.won}
              max={funnelMax}
              unit="个"
            />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
        <h2 className="text-base font-semibold text-slate-900">来源质量</h2>
        <p className="mt-1 text-xs text-slate-600">
          看哪个来源带来更多真实车商。旧 Inquiry ID 若无法关联 analytics，计入未知来源。
        </p>
        {!data.available ? (
          <p className="mt-3 text-sm text-slate-600">
            {data.error || "该统计项暂无可用数据来源"}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-600">
                  <th className="py-2 pr-3 font-medium">来源</th>
                  <th className="py-2 px-2 font-medium text-right whitespace-nowrap">
                    WhatsApp客户
                  </th>
                  <th className="py-2 px-2 font-medium text-right whitespace-nowrap">
                    车商
                  </th>
                  <th className="py-2 px-2 font-medium text-right whitespace-nowrap">
                    有采购意向
                  </th>
                  <th className="py-2 px-2 font-medium text-right whitespace-nowrap">
                    已报价
                  </th>
                  <th className="py-2 pl-2 font-medium text-right whitespace-nowrap">
                    成交
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sourceQuality.map((row) => (
                  <tr
                    key={row.source}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {row.label}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-slate-800">
                      {row.whatsappCustomers}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-slate-800">
                      {row.dealers}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-slate-800">
                      {row.interested}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-slate-800">
                      {row.quoted}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums font-semibold text-slate-900">
                      {row.won}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
        <h2 className="text-base font-semibold text-slate-900">
          WhatsApp 真实询盘
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          按 Inquiry ID 标记客户类型和销售阶段。选择「已联系」及之后的有效阶段会记为实际联系，无需再点一次。
        </p>
        {error ? (
          <p className="mt-2 text-sm text-red-700">{error}</p>
        ) : null}
        {!data.available ? (
          <p className="mt-3 text-sm text-slate-600">
            {data.error || "该统计项暂无可用数据来源"}
          </p>
        ) : data.leads.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            所选时间范围内暂无 WhatsApp 分配记录
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {data.leads.map((lead) => (
              <QualityLeadCard
                key={lead.id}
                lead={lead}
                busy={savingId === lead.id}
                onChange={patchLead}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
