"use client";

import { type CSSProperties, type ReactNode } from "react";
import { formatUsd } from "@/lib/admin/proforma/money";
import type {
  CompanySnapshot,
  PaymentAccountSnapshot,
  TermSnapshot,
} from "@/lib/admin/proforma/types";
import {
  CHARGES_HEIGHT,
  CHARGES_TOP,
  FOOTER_HEIGHT,
  FOOTER_TOP,
  HEADER_HEIGHT,
  HEADER_TOP,
  INFO_HEIGHT,
  INFO_TOP,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAYMENT_HEIGHT,
  PAYMENT_TOP,
  PI_MARGIN,
  PI_MAX_VEHICLES,
  TERMS_MAX_BOTTOM,
  TERMS_TOP,
  VEHICLE_HEADER_HEIGHT,
  VEHICLE_ROW_COUNT,
  VEHICLE_ROW_HEIGHT,
  VEHICLE_TABLE_HEIGHT,
  VEHICLE_TABLE_TOP,
  VEHICLE_TITLE_TOP,
  compactPaymentValue,
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
  vehicleSubtotalUsd: number;
  chargesTotalUsd: number;
  totalUsd: number;
  depositUsd: number;
  balanceUsd: number;
  terms: TermSnapshot[];
  notes: string;
  items: PreviewItem[];
  charges: PreviewCharge[];
};

function pt(n: number): string {
  return `${n}pt`;
}

function band(top: number, height: number): CSSProperties {
  return {
    position: "absolute",
    left: pt(PI_MARGIN),
    right: pt(PI_MARGIN),
    top: pt(top),
    height: pt(height),
    boxSizing: "border-box",
  };
}

/** Single A4 preview — shares the PDF coordinate map from layout.ts. */
export default function AdminProformaPreview({
  model,
  compact,
}: {
  model: ProformaPreviewModel;
  compact?: boolean;
}) {
  const overLimit = model.items.length > PI_MAX_VEHICLES;
  const dest = [model.destinationCountry, model.destinationPort]
    .filter(Boolean)
    .join(" / ");
  const website = model.company.companyWebsite || "fcautoexport.com";
  const contentW = PAGE_WIDTH - PI_MARGIN * 2;

  return (
    <div className="space-y-3">
      {overLimit ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          一张形式发票最多填写 8 台车辆。当前 {model.items.length}{" "}
          台 — 请删除多余车辆后再生成 PDF。 / A Proforma Invoice can contain
          up to 8 vehicles. Currently {model.items.length}.
        </div>
      ) : null}

      <div
        className="mx-auto overflow-hidden bg-white text-[#0f172a] shadow-lg"
        style={{
          fontFamily:
            '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Helvetica, Arial, sans-serif',
          width: compact ? "100%" : pt(PAGE_WIDTH),
          maxWidth: "100%",
          aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}`,
          position: "relative",
        }}
      >
        {/* Inner map: CSS pt === PDF pt */}
        <div
          className="relative"
          style={{
            width: pt(PAGE_WIDTH),
            height: pt(PAGE_HEIGHT),
            maxWidth: "100%",
            fontSize: "9pt",
            lineHeight: 1.25,
            containerType: "size",
          }}
        >
          {/* HEADER */}
          <div style={band(HEADER_TOP, HEADER_HEIGHT)}>
            <div className="flex h-full items-start justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1E293B]">
                  <div className="flex h-4 w-4 items-center justify-center rounded bg-[#D4AF37] text-[9px] font-bold text-[#1E293B]">
                    FC
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#1E293B]">
                    FC AUTO EXPORT
                  </p>
                  <p className="text-[9px] text-slate-500">USED VEHICLE EXPORT</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold tracking-wide text-[#1E293B]">
                  PROFORMA INVOICE
                </p>
                <p className="text-[10px] font-medium text-[#D4AF37]">形式发票</p>
              </div>
              <div className="max-w-[34%] text-right text-[9px] leading-tight text-slate-600">
                <p>{website}</p>
                <p className="text-[#1E293B]">{model.salespersonPhone}</p>
                <p className="text-[#1E293B]">{model.salespersonEmail}</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-[#D4AF37]" />
          </div>

          {/* INFO — never overlaps header */}
          <div
            style={{
              ...band(INFO_TOP, INFO_HEIGHT),
              overflow: "hidden",
            }}
          >
            <div className="grid h-full grid-cols-3 gap-2 border-b border-[#D4AF37] pb-1">
              <div className="space-y-0.5 overflow-hidden">
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
              <div className="overflow-hidden">
                <p className="mb-0.5 text-[11px] font-bold text-[#1E293B]">
                  Seller / 卖方
                </p>
                <Field label="Company" value={model.company.companyName} />
                <AddressField value={model.company.companyAddress} />
                <Field label="Sales" value={model.salespersonName} />
                <Field label="Phone" value={model.salespersonPhone} />
                <Field label="Email" value={model.salespersonEmail} />
                <Field label="Website" value={website} />
              </div>
              <div className="overflow-hidden">
                <p className="mb-0.5 text-[11px] font-bold text-[#1E293B]">
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
                {dest ? <Field label="Destination Port" value={dest} /> : null}
              </div>
            </div>
          </div>

          {/* VEHICLE TITLE */}
          <div
            style={{
              position: "absolute",
              left: pt(PI_MARGIN),
              top: pt(VEHICLE_TITLE_TOP),
              width: pt(contentW),
              height: pt(16),
            }}
          >
            <h3 className="text-[11px] font-bold text-[#1E293B]">
              Vehicle Items / 车辆明细
            </h3>
          </div>

          {/* VEHICLE TABLE — fixed 8 bordered rows */}
          <div
            style={{
              position: "absolute",
              left: pt(PI_MARGIN),
              top: pt(VEHICLE_TABLE_TOP),
              width: pt(contentW),
              height: pt(VEHICLE_TABLE_HEIGHT),
              overflow: "hidden",
            }}
          >
            <VehicleTable model={model} />
          </div>

          {/* CHARGES + SUMMARY */}
          <div
            style={{
              ...band(CHARGES_TOP, CHARGES_HEIGHT),
              overflow: "hidden",
            }}
          >
            <div className="grid h-full grid-cols-2 gap-2">
              <div className="overflow-hidden">
                <SectionTitle>Other Charges / 其他费用</SectionTitle>
                <ul className="space-y-0.5 text-[10px]">
                  {(model.charges.length
                    ? model.charges.slice(0, 5)
                    : [{ nameEn: "—", nameZh: "", amountUsd: 0 }]
                  ).map((c, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">
                        {c.nameEn}
                        {c.nameZh ? ` / ${c.nameZh}` : ""}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatUsd(c.amountUsd)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-2 border-t border-slate-200 pt-0.5 font-bold text-[#1E293B]">
                    <span className="truncate">
                      Total Other Charges / 其他费用合计
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatUsd(model.chargesTotalUsd)}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="overflow-hidden rounded border border-[#D4AF37] bg-slate-50 px-2 py-1 text-[10px]">
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
          </div>

          {/* PAYMENT */}
          <div
            style={{
              ...band(PAYMENT_TOP, PAYMENT_HEIGHT),
              overflow: "hidden",
            }}
          >
            <div className="h-full rounded border border-slate-200 px-2 py-1">
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
          </div>

          {/* TERMS */}
          <div
            style={{
              position: "absolute",
              left: pt(PI_MARGIN),
              right: pt(PI_MARGIN),
              top: pt(TERMS_TOP),
              height: pt(TERMS_MAX_BOTTOM - TERMS_TOP),
              overflow: "hidden",
            }}
          >
            {(model.terms.some((t) => t.enabled) || model.notes) && (
              <>
                <SectionTitle>Terms / 条款</SectionTitle>
                <ol className="list-decimal space-y-1 pl-4 text-[10px] leading-snug">
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
              </>
            )}
          </div>

          {/* FOOTER */}
          <div style={band(FOOTER_TOP, FOOTER_HEIGHT)}>
            <div className="mb-1 h-px bg-[#D4AF37]" />
            <p className="text-center text-[10px] font-bold tracking-wide text-[#1E293B]">
              FC AUTO EXPORT
            </p>
            <div className="relative text-[9px] text-slate-500">
              <p className="text-center">
                {website} · {model.salespersonPhone} · {model.salespersonEmail}
              </p>
              <p className="absolute right-0 top-0 font-medium text-[#1E293B]">
                Page 1 / 1
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleTable({ model }: { model: ProformaPreviewModel }) {
  const slots = Array.from({ length: VEHICLE_ROW_COUNT }, (_, i) => ({
    index: i,
    item: model.items[i] ?? null,
  }));

  return (
    <table
      className="w-full table-fixed border-collapse text-[10px]"
      style={{ height: pt(VEHICLE_TABLE_HEIGHT) }}
    >
      <thead>
        <tr
          className="bg-[#1E293B] text-white"
          style={{ height: pt(VEHICLE_HEADER_HEIGHT) }}
        >
          <Th en="No." zh="序号" className="w-[6%]" />
          <Th en="Brand" zh="品牌" className="w-[12%]" />
          <Th en="Model" zh="型号" className="w-[16%]" />
          <Th en="Year" zh="年份" className="w-[8%]" />
          <Th en="Colour" zh="颜色" className="w-[10%]" />
          <Th en="VIN / Chassis No." zh="VIN / 车架号" className="w-[18%]" />
          <Th en="Qty" zh="数量" center className="w-[6%]" />
          <Th en="Unit Price (USD)" zh="单价" right className="w-[12%]" />
          <Th en="Amount (USD)" zh="金额" right className="w-[12%]" />
        </tr>
      </thead>
      <tbody>
        {slots.map(({ index, item }) => (
          <tr
            key={index}
            className={index % 2 ? "bg-slate-50" : "bg-white"}
            style={{ height: pt(VEHICLE_ROW_HEIGHT) }}
          >
            <td className="border border-slate-200 px-1 truncate">
              {item ? index + 1 : "\u00a0"}
            </td>
            <td className="border border-slate-200 px-1 truncate font-semibold">
              {item?.brand ?? ""}
            </td>
            <td className="border border-slate-200 px-1 truncate">
              {item?.model ?? ""}
            </td>
            <td className="border border-slate-200 px-1 truncate">
              {item?.year || (item ? "—" : "")}
            </td>
            <td className="border border-slate-200 px-1 truncate">
              {item?.colour || (item ? "—" : "")}
            </td>
            <td className="border border-slate-200 px-1 truncate font-mono text-[9px]">
              {item?.vin || (item ? "—" : "")}
            </td>
            <td className="border border-slate-200 px-1 text-center">
              {item ? item.quantity : ""}
            </td>
            <td className="border border-slate-200 px-1 text-right tabular-nums truncate">
              {item ? formatUsd(item.unitPriceUsd) : ""}
            </td>
            <td className="border border-slate-200 px-1 text-right font-bold tabular-nums truncate">
              {item ? formatUsd(item.totalUsd) : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-0.5 text-[11px] font-bold text-[#1E293B]">{children}</h3>
  );
}

function PaymentField({ label, value }: { label: string; value: string }) {
  const display = compactPaymentValue(value);
  return (
    <p className="truncate leading-snug">
      <span className="text-[9px] text-slate-500">{label}: </span>
      <span className="text-[10px] font-semibold text-[#1E293B]">{display}</span>
    </p>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] leading-tight text-slate-500">{label}</p>
      <p className="truncate text-[10px] font-semibold leading-tight text-[#1E293B]">
        {value}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="mb-0 truncate text-[10px] leading-tight">
      <span className="text-slate-500">{label}: </span>
      <span className="text-[#1E293B]">{value}</span>
    </p>
  );
}

/** Address: max 4 lines + ellipsis; does not grow INFO_HEIGHT. */
function AddressField({ value }: { value: string }) {
  return (
    <p className="mb-0 text-[10px] leading-tight">
      <span className="text-slate-500">Address: </span>
      <span
        className="text-[#1E293B]"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {value || "—"}
      </span>
    </p>
  );
}

function Th({
  en,
  zh,
  right,
  center,
  className,
}: {
  en: string;
  zh: string;
  right?: boolean;
  center?: boolean;
  className?: string;
}) {
  return (
    <th
      className={`px-1 py-0.5 font-semibold ${
        right ? "text-right" : center ? "text-center" : "text-left"
      } ${className ?? ""}`}
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
      <span
        className={`truncate ${
          strong ? "font-bold text-[#1E293B]" : "text-slate-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`shrink-0 tabular-nums ${
          strong ? "font-bold text-[#1E293B]" : "text-[#1E293B]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
