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

/** A4 portrait preview aligned with PDF V3 (Noto Sans SC / bilingual layout). */
export default function AdminProformaPreview({
  model,
  compact,
}: {
  model: ProformaPreviewModel;
  compact?: boolean;
}) {
  const terms = model.terms;
  const destPort = [model.destinationCountry, model.destinationPort]
    .filter(Boolean)
    .join(" / ");

  return (
    <div
      className={`mx-auto bg-white text-[#0f172a] shadow-lg ${
        compact ? "w-full max-w-[210mm]" : "w-[210mm] max-w-full"
      }`}
      style={{
        fontFamily:
          '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Helvetica, Arial, sans-serif',
        aspectRatio: "210 / 297",
        minHeight: compact ? undefined : "297mm",
      }}
    >
      <div className="h-[3px] bg-[#D4AF37]" />
      <div className="space-y-3.5 p-5 sm:p-6 text-[12px] leading-relaxed">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded bg-[#1E293B]">
              <span className="rounded bg-[#D4AF37] px-1 py-0.5 text-[11px] font-bold text-[#1E293B]">
                FC
              </span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#1E293B]">
                FC Auto Export
              </p>
              <p className="text-[11px] text-slate-500">Used Vehicle Export</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold tracking-wide text-[#1E293B]">
              PROFORMA INVOICE
            </p>
            <p className="text-[11px] font-medium text-[#D4AF37]">
              {model.company.companyWebsite || "fcautoexport.com"}
            </p>
          </div>
        </div>

        <div className="border-t border-[#D4AF37]" />

        {/* Identifiers */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta label="Invoice No. / 发票号" value={model.invoiceNumber} />
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="mb-2 text-[12px] font-bold text-[#1E293B]">
              Seller / 卖方
            </p>
            <Field label="Company" value={model.company.companyName} />
            <Field label="Address" value={model.company.companyAddress} />
            <Field label="Sales" value={model.salespersonName} />
            <Field label="Phone" value={model.salespersonPhone} />
            <Field label="Email" value={model.salespersonEmail} />
            <Field label="Website" value={model.company.companyWebsite} />
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="mb-2 text-[12px] font-bold text-[#1E293B]">
              Buyer / 买方
            </p>
            <Field label="Customer" value={model.customerName || "—"} />
            {model.customerCompany ? (
              <Field label="Company" value={model.customerCompany} />
            ) : null}
            {model.customerCountry ? (
              <Field label="Country" value={model.customerCountry} />
            ) : null}
            {model.customerWhatsapp ? (
              <Field label="WhatsApp" value={model.customerWhatsapp} />
            ) : null}
            {model.customerEmail ? (
              <Field label="Email" value={model.customerEmail} />
            ) : null}
            {destPort ? (
              <Field label="Destination Port" value={destPort} />
            ) : null}
          </div>
        </div>

        {/* Vehicles */}
        <div>
          <h3 className="mb-1.5 text-[13px] font-bold text-[#1E293B]">
            Vehicle Items / 车辆明细
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#1E293B] text-white">
                  <Th en="No." zh="序号" />
                  <Th en="Brand" zh="品牌" />
                  <Th en="Model" zh="型号" />
                  <Th en="Year" zh="年份" />
                  <Th en="Colour" zh="颜色" />
                  <Th en="VIN / Chassis No." zh="VIN / 车架号" />
                  <Th en="Qty" zh="数量" right />
                  <Th en="Unit Price" zh="单价" right />
                  <Th en="Amount" zh="金额" right />
                </tr>
              </thead>
              <tbody>
                {model.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
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
                      <td className="border border-slate-200 px-1.5 py-1.5">
                        {i + 1}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5 font-semibold">
                        {item.brand}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5">
                        {item.model}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5">
                        {item.year || "—"}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5">
                        {item.colour || "—"}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5 font-mono text-[10px]">
                        {item.vin || "—"}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5 text-right">
                        {item.quantity}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5 text-right">
                        {formatUsd(item.unitPriceUsd)}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1.5 text-right font-bold">
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-[13px] font-bold text-[#1E293B]">
              Other Charges / 其他费用
            </h3>
            <ul className="space-y-1 text-[11px]">
              {model.charges.length === 0 ? (
                <li className="text-slate-400">—</li>
              ) : (
                model.charges.map((c, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {c.nameEn}
                      {c.nameZh ? ` / ${c.nameZh}` : ""}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatUsd(c.amountUsd)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-md border border-[#D4AF37] bg-slate-50 p-3 text-[11px]">
            <h3 className="mb-1.5 text-[13px] font-bold text-[#1E293B]">
              Financial Summary / 金额汇总
            </h3>
            <SummaryRow
              label="Vehicle Total"
              value={formatUsd(model.vehicleSubtotalUsd)}
            />
            <SummaryRow
              label="Other Charges"
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
          <h3 className="mb-1.5 text-[13px] font-bold text-[#1E293B]">
            Payment Information / 付款信息
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <Meta
              label="Beneficiary / 收款人"
              value={model.payment.fullName || "—"}
            />
            <Meta
              label="Bank / 开户银行"
              value={model.payment.bankName || "—"}
            />
            <Meta
              label="Account Number / 银行账号"
              value={model.payment.accountNumber || "—"}
            />
            <Meta
              label="SWIFT / SWIFT代码"
              value={model.payment.swift || "—"}
            />
          </div>
          {model.payment.bankAddress ? (
            <p className="mt-1.5 text-[11px] text-slate-600">
              Bank Address / 开户行地址: {model.payment.bankAddress}
            </p>
          ) : null}
        </div>

        {/* Terms — English then Chinese on separate lines */}
        {(terms.some((t) => t.enabled) || model.notes) && (
          <div>
            <h3 className="mb-1.5 text-[13px] font-bold text-[#1E293B]">
              Terms / 条款
            </h3>
            <ol className="list-decimal space-y-2 pl-4 text-[11px] text-slate-800">
              {terms
                .filter((t) => t.enabled)
                .map((t) => (
                  <li key={t.id} className="marker:font-semibold">
                    {t.textEn ? <p className="leading-relaxed">{t.textEn}</p> : null}
                    {t.textZh ? (
                      <p className="mt-0.5 leading-relaxed text-slate-500">
                        {t.textZh}
                      </p>
                    ) : null}
                  </li>
                ))}
            </ol>
            {model.notes ? (
              <p className="mt-2 text-[11px] text-slate-600">{model.notes}</p>
            ) : null}
          </div>
        )}

        <div className="border-t border-slate-200 pt-2 text-center text-[10px] text-slate-500">
          <p className="font-bold tracking-wide text-[#1E293B]">
            FC AUTO EXPORT
          </p>
          <p>www.fcautoexport.com</p>
          <p>Used Vehicle Export</p>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-[12px] font-semibold text-[#1E293B]">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="mb-1 text-[11px] leading-snug">
      <span className="text-slate-500">{label}: </span>
      <span className="text-[#1E293B]">{value}</span>
    </p>
  );
}

function Th({
  en,
  zh,
  right,
}: {
  en: string;
  zh: string;
  right?: boolean;
}) {
  return (
    <th
      className={`px-1.5 py-1.5 ${right ? "text-right" : "text-left"} font-semibold`}
    >
      <div className="leading-tight">{en}</div>
      <div className="text-[9px] font-normal opacity-90">{zh}</div>
    </th>
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
        className={strong ? "font-bold text-[#1E293B]" : "text-slate-600"}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          strong ? "font-bold text-[#1E293B]" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
