"use client";

import { formatUsd } from "@/lib/admin/proforma/money";
import type {
  CompanySnapshot,
  PaymentAccountSnapshot,
  TermSnapshot,
} from "@/lib/admin/proforma/types";

export type PreviewItem = {
  brand: string;
  model: string;
  year: string;
  colour: string;
  vin: string;
  unitPriceUsd: number;
  quantity: number;
  totalUsd: number;
  note: string;
};

export type PreviewCharge = {
  nameZh: string;
  nameEn: string;
  amountUsd: number;
};

export type ProformaPreviewModel = {
  invoiceNumber: string;
  contractNumber: string;
  offerDate: string;
  validityText: string;
  customerName: string;
  customerCompany: string;
  customerCountry: string;
  customerAddress: string;
  customerWhatsapp: string;
  customerEmail: string;
  destinationCountry: string;
  destinationPort: string;
  salespersonName: string;
  salespersonPhone: string;
  salespersonEmail: string;
  company: CompanySnapshot;
  payment: PaymentAccountSnapshot;
  items: PreviewItem[];
  charges: PreviewCharge[];
  vehicleSubtotalUsd: number;
  chargesTotalUsd: number;
  totalUsd: number;
  depositUsd: number;
  balanceUsd: number;
  terms: TermSnapshot[];
  notes: string;
};

/** Compact A4 portrait preview aligned with PDF V2. Exact saved terms — no rewrite. */
export default function AdminProformaPreview({
  model,
  compact,
}: {
  model: ProformaPreviewModel;
  compact?: boolean;
}) {
  const terms = model.terms;
  const dest = [model.destinationCountry, model.destinationPort]
    .filter(Boolean)
    .join(" / ");

  return (
    <div
      className={`mx-auto bg-white text-[#0f172a] shadow-lg ${
        compact ? "w-full max-w-[210mm]" : "w-[210mm] max-w-full"
      }`}
      style={{
        minHeight: compact ? undefined : "297mm",
        aspectRatio: compact ? "210 / 297" : "210 / 297",
      }}
    >
      <div className="h-0.5 bg-[#D4AF37]" />
      <div className="space-y-3 p-4 sm:p-5 text-[11px] leading-snug">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1E293B]">
              <span className="rounded bg-[#D4AF37] px-1 py-0.5 text-[10px] font-bold text-[#1E293B]">
                FC
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E293B]">FC Auto Export</p>
              <p className="text-[10px] text-slate-500">Used Vehicle Export</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold tracking-wide text-[#1E293B]">
              PROFORMA INVOICE
            </p>
            <p className="text-[10px] font-medium text-[#D4AF37]">
              {model.company.companyWebsite || "fcautoexport.com"}
            </p>
          </div>
        </div>

        <div className="border-t border-[#D4AF37] pt-2" />

        {/* Identifiers */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Meta label="Invoice No. / 发票编号" value={model.invoiceNumber} />
          <Meta
            label="Contract No. / 合同号"
            value={model.contractNumber || model.invoiceNumber}
          />
          <Meta label="Offer Date / 报价日期" value={model.offerDate} />
          <Meta
            label="Validity / 有效期"
            value={model.validityText || "7 Days"}
          />
        </div>

        {/* Seller | Buyer */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded bg-slate-50 p-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#1E293B]">
              Seller / 卖方
            </p>
            <p className="font-semibold">{model.company.companyName}</p>
            <p className="mt-0.5 text-[10px] text-slate-600">
              {model.company.companyAddress}
            </p>
            <p className="mt-1">
              {model.salespersonName || "—"} · {model.salespersonPhone}
            </p>
            <p className="text-[10px] text-slate-600">
              {model.salespersonEmail} · {model.company.companyWebsite}
            </p>
          </div>
          <div className="rounded bg-slate-50 p-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#1E293B]">
              Buyer / 买方
            </p>
            <p className="font-semibold">{model.customerName || "—"}</p>
            {model.customerCompany ? (
              <p>{model.customerCompany}</p>
            ) : null}
            <p className="text-[10px] text-slate-600">
              {[
                model.customerCountry,
                model.customerWhatsapp
                  ? `WA: ${model.customerWhatsapp}`
                  : null,
                model.customerEmail,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            {dest ? (
              <p className="mt-0.5">Destination: {dest}</p>
            ) : null}
          </div>
        </div>

        {/* Vehicles */}
        <div>
          <h3 className="mb-1 text-[11px] font-bold text-[#1E293B]">
            Vehicle Items / 车辆明细
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-[#1E293B] text-white">
                  <th className="px-1.5 py-1.5 text-left">No.</th>
                  <th className="px-1.5 py-1.5 text-left">Brand / Model</th>
                  <th className="px-1.5 py-1.5 text-left">Year</th>
                  <th className="px-1.5 py-1.5 text-left">Colour</th>
                  <th className="px-1.5 py-1.5 text-left">VIN</th>
                  <th className="px-1.5 py-1.5 text-right">Qty</th>
                  <th className="px-1.5 py-1.5 text-right">Unit Price</th>
                  <th className="px-1.5 py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {model.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="border border-slate-200 px-2 py-3 text-center text-slate-400"
                    >
                      暂无车辆
                    </td>
                  </tr>
                ) : (
                  model.items.map((item, i) => (
                    <tr
                      key={i}
                      className={i % 2 ? "bg-slate-50" : "bg-white"}
                    >
                      <td className="border border-slate-200 px-1.5 py-1">
                        {i + 1}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 font-medium">
                        {item.brand} {item.model}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1">
                        {item.year || "—"}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1">
                        {item.colour || "—"}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 font-mono text-[9px]">
                        {item.vin || "—"}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-right">
                        {item.quantity}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-right">
                        {formatUsd(item.unitPriceUsd)}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-right font-semibold">
                        {formatUsd(item.totalUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charges + Summary */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-[11px] font-bold text-[#1E293B]">
              Other Charges / 其他费用
            </h3>
            <ul className="space-y-0.5 text-[10px]">
              {model.charges.length === 0 ? (
                <li className="text-slate-400">—</li>
              ) : (
                model.charges.map((c, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {c.nameEn}
                      {c.nameZh ? ` / ${c.nameZh}` : ""}
                    </span>
                    <span className="font-medium">
                      {formatUsd(c.amountUsd)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded border border-[#D4AF37] bg-slate-50 p-2 text-[10px]">
            <SummaryRow
              label="Vehicle Total / 车辆合计"
              value={formatUsd(model.vehicleSubtotalUsd)}
            />
            <SummaryRow
              label="Other Charges / 其他费用"
              value={formatUsd(model.chargesTotalUsd)}
            />
            <SummaryRow
              label="Grand Total / 总计"
              value={formatUsd(model.totalUsd)}
              strong
            />
            <SummaryRow
              label="Deposit / 定金"
              value={formatUsd(model.depositUsd)}
            />
            <SummaryRow
              label="Balance / 尾款"
              value={formatUsd(model.balanceUsd)}
              strong
            />
          </div>
        </div>

        {/* Payment */}
        <div>
          <h3 className="mb-1 text-[11px] font-bold text-[#1E293B]">
            Payment Information / 付款信息
          </h3>
          <div className="grid grid-cols-2 gap-1 text-[10px] sm:grid-cols-4">
            <Meta
              label="Beneficiary / 收款人"
              value={model.payment.fullName || "—"}
            />
            <Meta label="Bank / 银行" value={model.payment.bankName || "—"} />
            <Meta
              label="Account / 账号"
              value={model.payment.accountNumber || "—"}
            />
            <Meta label="SWIFT" value={model.payment.swift || "—"} />
          </div>
          {model.payment.bankAddress ? (
            <p className="mt-1 text-[10px] text-slate-600">
              Bank Address: {model.payment.bankAddress}
            </p>
          ) : null}
        </div>

        {/* Terms — exact snapshot */}
        {(terms.some((t) => t.enabled) || model.notes) && (
          <div>
            <h3 className="mb-1 text-[11px] font-bold text-[#1E293B]">
              Terms / 条款
            </h3>
            <ol className="list-decimal space-y-1 pl-4 text-[10px] text-slate-700">
              {terms
                .filter((t) => t.enabled)
                .map((t) => (
                  <li key={t.id}>
                    {t.textEn}
                    {t.textZh ? (
                      <span className="text-slate-500"> ｜ {t.textZh}</span>
                    ) : null}
                  </li>
                ))}
            </ol>
            {model.notes ? (
              <p className="mt-1 text-[10px] text-slate-600">{model.notes}</p>
            ) : null}
          </div>
        )}

        <div className="border-t border-slate-200 pt-2 text-center text-[9px] text-slate-500">
          FC Auto Export · fcautoexport.com
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-slate-500">{label}</p>
      <p className="font-semibold text-[#1E293B]">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span
        className={strong ? "font-semibold text-[#1E293B]" : "text-slate-600"}
      >
        {label}
      </span>
      <span className={strong ? "font-bold text-[#1E293B]" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
