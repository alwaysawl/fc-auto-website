"use client";

import { useMemo, type ReactNode } from "react";
import { formatUsd } from "@/lib/admin/proforma/money";
import type {
  CompanySnapshot,
  PaymentAccountSnapshot,
  TermSnapshot,
} from "@/lib/admin/proforma/types";
import {
  compactPaymentValue,
  paginateProformaVehicles,
  type ProformaLayoutInput,
} from "@/lib/proforma/layout";

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

/** Multi-page A4 preview matching the approved PDF layout. */
export default function AdminProformaPreview({
  model,
  compact,
}: {
  model: ProformaPreviewModel;
  compact?: boolean;
}) {
  const pages = useMemo(() => {
    const input: ProformaLayoutInput = {
      items: model.items.map((item) => ({
        brand: item.brand,
        model: item.model,
        year: item.year,
        colour: item.colour,
        vin: item.vin,
      })),
      chargesCount: model.charges.length,
      enabledTerms: model.terms
        .filter((t) => t.enabled)
        .map((t) => ({ textEn: t.textEn, textZh: t.textZh })),
      notes: model.notes,
      companyAddress: model.company.companyAddress || "",
      customerCompany: model.customerCompany,
      customerCountry: model.customerCountry,
      customerWhatsapp: model.customerWhatsapp,
      customerEmail: model.customerEmail,
      destinationCountry: model.destinationCountry,
      destinationPort: model.destinationPort,
      payment: {
        fullName: model.payment.fullName,
        bankName: model.payment.bankName,
        accountNumber: model.payment.accountNumber,
        bankAddress: model.payment.bankAddress,
        swift: model.payment.swift,
      },
    };
    return paginateProformaVehicles(input).pages;
  }, [model]);

  const totalPages = Math.max(1, pages.length);

  return (
    <div className="space-y-4">
      {pages.map((indices, pageIndex) => (
        <A4Page
          key={pageIndex}
          model={model}
          pageIndex={pageIndex}
          totalPages={totalPages}
          itemIndices={indices}
          hasMoreAfter={
            pageIndex === 0 && model.items.length > indices.length
          }
          isLastVehiclePage={pageIndex === pages.length - 1}
          compact={compact}
        />
      ))}
    </div>
  );
}

function A4Page({
  model,
  pageIndex,
  totalPages,
  itemIndices,
  hasMoreAfter,
  isLastVehiclePage,
  compact,
}: {
  model: ProformaPreviewModel;
  pageIndex: number;
  totalPages: number;
  itemIndices: number[];
  hasMoreAfter: boolean;
  isLastVehiclePage: boolean;
  compact?: boolean;
}) {
  const isFirst = pageIndex === 0;
  const website = model.company.companyWebsite || "fcautoexport.com";
  const dest = [model.destinationCountry, model.destinationPort]
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
        minHeight: compact ? undefined : "297mm",
      }}
    >
      <div className="flex min-h-[inherit] flex-col p-4 sm:p-5 text-[11px] leading-snug">
        {/* Header */}
        <Header
          website={website}
          phone={model.salespersonPhone}
          email={model.salespersonEmail}
          compact={!isFirst}
        />

        {isFirst ? (
          <>
            {/* 3-column info */}
            <div className="mt-2 grid grid-cols-1 gap-2 border-b border-[#D4AF37] pb-2 sm:grid-cols-3">
              <div className="space-y-1.5">
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
                <Meta label="Currency / 货币" value="USD" />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold text-[#1E293B]">
                  Seller / 卖方
                </p>
                <Field label="Company" value={model.company.companyName} />
                <Field label="Address" value={model.company.companyAddress} />
                <Field label="Sales" value={model.salespersonName} />
                <Field label="Phone" value={model.salespersonPhone} />
                <Field label="Email" value={model.salespersonEmail} />
                <Field label="Website" value={website} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold text-[#1E293B]">
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
                {dest ? (
                  <Field label="Destination Port" value={dest} />
                ) : null}
              </div>
            </div>

            <SectionTitle>
              Vehicle Items / 车辆明细
            </SectionTitle>
            <VehicleTable model={model} indices={itemIndices} />
            {hasMoreAfter ? (
              <p className="mt-1.5 text-[10px] text-slate-500">
                For more vehicles, please see next page. / 如有更多车辆，请见下一页。
              </p>
            ) : null}

            {/* Charges + Summary */}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <SectionTitle>Other Charges / 其他费用</SectionTitle>
                <ul className="space-y-0.5 text-[10px]">
                  {(model.charges.length
                    ? model.charges
                    : [{ nameEn: "—", nameZh: "", amountUsd: 0 }]
                  ).map((c, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {c.nameEn}
                        {c.nameZh ? ` / ${c.nameZh}` : ""}
                      </span>
                      <span className="tabular-nums">
                        {formatUsd(c.amountUsd)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-2 border-t border-slate-200 pt-1 font-bold text-[#1E293B]">
                    <span>Total Other Charges / 其他费用合计</span>
                    <span className="tabular-nums">
                      {formatUsd(model.chargesTotalUsd)}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded border border-[#D4AF37] bg-slate-50 p-2 text-[10px]">
                <SectionTitle>Financial Summary / 金额汇总</SectionTitle>
                <SummaryRow
                  label="Vehicle Total / 车辆总价"
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
            <div className="mt-2 rounded border border-slate-200 px-2 py-1.5">
              <SectionTitle>Payment Information / 付款信息</SectionTitle>
              <div className="grid gap-0.5 sm:grid-cols-2 text-[10px]">
                <PaymentField
                  label="Beneficiary / 收款人"
                  value={model.payment.fullName}
                />
                <PaymentField
                  label="Bank Address / 开户行地址"
                  value={model.payment.bankAddress}
                />
                <PaymentField
                  label="Bank / 开户银行"
                  value={model.payment.bankName}
                />
                <PaymentField
                  label="SWIFT / SWIFT代码"
                  value={model.payment.swift}
                />
                <PaymentField
                  label="Account Number / 银行账号"
                  value={model.payment.accountNumber}
                />
              </div>
            </div>

            {/* Terms */}
            {(model.terms.some((t) => t.enabled) || model.notes) && (
              <div className="mt-2">
                <SectionTitle>Terms / 条款</SectionTitle>
                <ol className="list-decimal space-y-0.5 pl-4 text-[10px] leading-snug">
                  {model.terms
                    .filter((t) => t.enabled)
                    .map((t) => (
                      <li key={t.id}>
                        {t.textEn ? (
                          <p className="leading-snug text-[#1E293B]">
                            {t.textEn}
                          </p>
                        ) : null}
                        {t.textZh ? (
                          <p className="leading-snug text-slate-500">
                            {t.textZh}
                          </p>
                        ) : null}
                      </li>
                    ))}
                </ol>
                {model.notes ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-600">
                    {model.notes}
                  </p>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <>
            <SectionTitle>
              Vehicle Items (Continued) / 车辆明细（续）
            </SectionTitle>
            <VehicleTable model={model} indices={itemIndices} />
            {isLastVehiclePage ? (
              <p className="mt-3 text-center text-[10px] font-semibold text-slate-500">
                *** End of List / 以下无更多车辆 ***
              </p>
            ) : null}
          </>
        )}

        <div className="mt-auto pt-3">
          <Footer
            website={website}
            phone={model.salespersonPhone}
            email={model.salespersonEmail}
            page={pageIndex + 1}
            total={totalPages}
          />
        </div>
      </div>
    </div>
  );
}

function Header({
  website,
  phone,
  email,
  compact,
}: {
  website: string;
  phone: string;
  email: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div
            className={`flex items-center justify-center rounded bg-[#1E293B] ${
              compact ? "h-5 w-5" : "h-6 w-6"
            }`}
          >
            <span className="rounded bg-[#D4AF37] px-0.5 text-[9px] font-bold text-[#1E293B]">
              FC
            </span>
          </div>
          <div>
            <p
              className={`font-bold text-[#1E293B] ${
                compact ? "text-[11px]" : "text-[13px]"
              }`}
            >
              FC AUTO EXPORT
            </p>
            <p className="text-[9px] tracking-wide text-slate-500">
              USED VEHICLE EXPORT
            </p>
          </div>
        </div>
        <div className="text-center">
          <p
            className={`font-bold text-[#1E293B] ${
              compact ? "text-[13px]" : "text-[16px]"
            }`}
          >
            PROFORMA INVOICE
          </p>
          <p className="text-[10px] font-medium text-[#D4AF37]">形式发票</p>
        </div>
        <div className="max-w-[34%] text-right text-[9px] leading-tight text-slate-600">
          <p>{website}</p>
          <p className="text-[#1E293B]">{phone}</p>
          <p className="text-[#1E293B]">{email}</p>
        </div>
      </div>
      <div className="mt-2 h-px bg-[#D4AF37]" />
    </div>
  );
}

function Footer({
  website,
  phone,
  email,
  page,
  total,
}: {
  website: string;
  phone: string;
  email: string;
  page: number;
  total: number;
}) {
  return (
    <div>
      <div className="mb-1.5 h-px bg-[#D4AF37]" />
      <p className="text-center text-[10px] font-bold tracking-wide text-[#1E293B]">
        FC AUTO EXPORT
      </p>
      <div className="relative mt-0.5 text-[9px] text-slate-500">
        <p className="text-center">
          {website} · {phone} · {email}
        </p>
        <p className="absolute right-0 top-0 font-medium text-[#1E293B]">
          Page {page} / {total}
        </p>
      </div>
    </div>
  );
}

function VehicleTable({
  model,
  indices,
}: {
  model: ProformaPreviewModel;
  indices: number[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-[#1E293B] text-white">
            <Th en="No." zh="序号" />
            <Th en="Brand" zh="品牌" />
            <Th en="Model" zh="型号" />
            <Th en="Year" zh="年份" />
            <Th en="Colour" zh="颜色" />
            <Th en="VIN / Chassis No." zh="VIN / 车架号" />
            <Th en="Qty" zh="数量" center />
            <Th en="Unit Price (USD)" zh="单价" right />
            <Th en="Amount (USD)" zh="金额" right />
          </tr>
        </thead>
        <tbody>
          {indices.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="border border-slate-200 px-2 py-2 text-center text-slate-400"
              >
                —
              </td>
            </tr>
          ) : (
            indices.map((itemIndex, i) => {
              const item = model.items[itemIndex]!;
              return (
                <tr
                  key={itemIndex}
                  className={i % 2 ? "bg-slate-50" : "bg-white"}
                >
                  <td className="border border-slate-200 px-1 py-1">
                    {itemIndex + 1}
                  </td>
                  <td className="border border-slate-200 px-1 py-1 font-semibold">
                    {item.brand}
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    {item.model}
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    {item.year || "—"}
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    {item.colour || "—"}
                  </td>
                  <td className="border border-slate-200 px-1 py-1 font-mono text-[9px]">
                    {item.vin || "—"}
                  </td>
                  <td className="border border-slate-200 px-1 py-1 text-center">
                    {item.quantity}
                  </td>
                  <td className="border border-slate-200 px-1 py-1 text-right tabular-nums">
                    {formatUsd(item.unitPriceUsd)}
                  </td>
                  <td className="border border-slate-200 px-1 py-1 text-right font-bold tabular-nums">
                    {formatUsd(item.totalUsd)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-0.5 mt-1.5 text-[12px] font-bold text-[#1E293B]">
      {children}
    </h3>
  );
}

function PaymentField({ label, value }: { label: string; value: string }) {
  const display = compactPaymentValue(value);
  return (
    <p className="leading-snug">
      <span className="text-[9px] text-slate-500">{label}: </span>
      <span className="text-[10px] font-semibold text-[#1E293B]">{display}</span>
    </p>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-slate-500">{label}</p>
      <p className="text-[11px] font-semibold text-[#1E293B]">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="mb-0.5 text-[10px] leading-snug">
      <span className="text-slate-500">{label}: </span>
      <span className="text-[#1E293B]">{value}</span>
    </p>
  );
}

function Th({
  en,
  zh,
  right,
  center,
}: {
  en: string;
  zh: string;
  right?: boolean;
  center?: boolean;
}) {
  return (
    <th
      className={`px-1 py-1 font-semibold ${
        right ? "text-right" : center ? "text-center" : "text-left"
      }`}
    >
      <div className="leading-tight">{en}</div>
      <div className="text-[8px] font-normal opacity-90">{zh}</div>
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
      <span className={strong ? "font-bold text-[#1E293B]" : "text-slate-600"}>
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
