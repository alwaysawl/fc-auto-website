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

export default function AdminProformaPreview({
  model,
  compact,
}: {
  model: ProformaPreviewModel;
  compact?: boolean;
}) {
  return (
    <div
      className={`mx-auto bg-white text-[#0f172a] shadow-lg ${
        compact ? "w-full max-w-[210mm]" : "w-[210mm] max-w-full"
      }`}
      style={{
        minHeight: compact ? undefined : "297mm",
        aspectRatio: compact ? undefined : "210 / 297",
      }}
    >
      <div className="h-1 bg-[#D4AF37]" />
      <div className="space-y-5 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1E293B]">
              <span className="rounded bg-[#D4AF37] px-1.5 py-0.5 text-xs font-bold text-[#1E293B]">
                FC
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-[#1E293B]">FC Auto Export</p>
              <p className="text-xs text-slate-500">
                {model.company.companyWebsite}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tracking-wide text-[#1E293B]">
              PROFORMA INVOICE
            </p>
            <p className="text-sm font-semibold text-[#D4AF37]">形式发票</p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[#D4AF37] pt-4 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <Meta label="发票编号 / Invoice No." value={model.invoiceNumber} />
            <Meta label="合同号 / Contract No." value={model.contractNumber} />
            <Meta label="报价日期 / Offer Date" value={model.offerDate} />
            <Meta label="有效期 / Validity" value={model.validityText || "—"} />
          </div>
          <div className="space-y-2 text-sm">
            <Meta label="收货方 / To" value={model.customerName || "—"} />
            {model.customerCompany ? (
              <Meta label="客户公司 / Company" value={model.customerCompany} />
            ) : null}
            <Meta
              label="国家 / Country"
              value={model.customerCountry || "—"}
            />
            <Meta
              label="目的地 / Destination"
              value={
                [model.destinationCountry, model.destinationPort]
                  .filter(Boolean)
                  .join(" / ") || "—"
              }
            />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            卖方 / Seller
          </p>
          <p className="font-semibold">{model.company.companyName}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {model.company.companyAddress}
          </p>
          <p className="mt-2 text-xs">
            Sales: {model.salespersonName || "—"} · {model.salespersonPhone} ·{" "}
            {model.salespersonEmail}
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold text-[#1E293B]">
            车辆明细 / Vehicle Items
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#1E293B] text-white">
                  <th className="px-2 py-2 text-left">No.</th>
                  <th className="px-2 py-2 text-left">Brand / Model</th>
                  <th className="px-2 py-2 text-left">Year</th>
                  <th className="px-2 py-2 text-left">Colour</th>
                  <th className="px-2 py-2 text-left">VIN</th>
                  <th className="px-2 py-2 text-right">Unit</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {model.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="border border-slate-200 px-2 py-4 text-center text-slate-400"
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
                      <td className="border border-slate-200 px-2 py-2">
                        {i + 1}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 font-medium">
                        {item.brand} {item.model}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {item.year || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-2">
                        {item.colour || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 font-mono text-[10px]">
                        {item.vin || "—"}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right">
                        {formatUsd(item.unitPriceUsd)}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right">
                        {item.quantity}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-right font-semibold">
                        {formatUsd(item.totalUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {model.charges.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-[#1E293B]">
              其他费用 / Other Charges
            </h3>
            <ul className="space-y-1 text-xs">
              {model.charges.map((c, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>
                    {c.nameZh} / {c.nameEn}
                  </span>
                  <span className="font-medium">{formatUsd(c.amountUsd)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ml-auto w-full max-w-xs rounded-lg border border-[#D4AF37] bg-slate-50 p-3 text-xs">
          <SummaryRow
            label="车辆小计 / Vehicle Subtotal"
            value={formatUsd(model.vehicleSubtotalUsd)}
          />
          <SummaryRow
            label="其他费用 / Other Charges"
            value={formatUsd(model.chargesTotalUsd)}
          />
          <SummaryRow
            label="总计 / TOTAL"
            value={formatUsd(model.totalUsd)}
            strong
          />
          <SummaryRow
            label="定金 / Deposit"
            value={formatUsd(model.depositUsd)}
          />
          <SummaryRow
            label="尾款 / Balance"
            value={formatUsd(model.balanceUsd)}
            strong
          />
        </div>

        <div className="text-xs">
          <h3 className="mb-2 text-sm font-bold text-[#1E293B]">
            付款信息 / Payment Information
          </h3>
          <div className="space-y-1 text-slate-700">
            {model.payment.fullName && (
              <p>收款人 / Full Name: {model.payment.fullName}</p>
            )}
            {model.payment.bankName && (
              <p>银行 / Bank: {model.payment.bankName}</p>
            )}
            {model.payment.accountNumber && (
              <p>账号 / Account: {model.payment.accountNumber}</p>
            )}
            {model.payment.swift && <p>SWIFT: {model.payment.swift}</p>}
            {model.payment.bankAddress && (
              <p>银行地址: {model.payment.bankAddress}</p>
            )}
            {model.payment.paymentNote && (
              <p>备注: {model.payment.paymentNote}</p>
            )}
            {!model.payment.fullName &&
              !model.payment.accountNumber &&
              !model.payment.bankName && (
                <p className="text-slate-400">尚未填写收款信息</p>
              )}
          </div>
        </div>

        {(model.terms.some((t) => t.enabled) || model.notes) && (
          <div className="text-xs">
            <h3 className="mb-2 text-sm font-bold text-[#1E293B]">
              条款与说明 / Terms & Notes
            </h3>
            <ol className="list-decimal space-y-2 pl-4 text-slate-700">
              {model.terms
                .filter((t) => t.enabled)
                .map((t) => (
                  <li key={t.id}>
                    <p>{t.textZh}</p>
                    <p className="text-slate-500">{t.textEn}</p>
                  </li>
                ))}
            </ol>
            {model.notes ? (
              <p className="mt-2 text-slate-700">{model.notes}</p>
            ) : null}
          </div>
        )}

        <div className="border-t border-slate-200 pt-3 text-center text-[11px] text-slate-500">
          FC Auto Export · fcautoexport.com
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
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
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className={strong ? "font-semibold text-[#1E293B]" : "text-slate-600"}>
        {label}
      </span>
      <span className={strong ? "font-bold text-[#1E293B]" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
