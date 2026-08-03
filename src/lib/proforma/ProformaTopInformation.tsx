"use client";

/**
 * Shared top-information renderer for Admin Proforma Preview.
 * Three horizontal columns on one row:
 *   Left:   Seller / 卖方
 *   Middle: Buyer / 买方
 *   Right:  Invoice Information / 发票信息
 *
 * Field rows use right-aligned labels + a shared colon column + fixed value X
 * (same geometry as the PDF drawer via layout.ts metrics).
 */

import type { CSSProperties, ReactNode } from "react";
import {
  BUYER_FIELD,
  INFO_HEIGHT,
  INFO_TOP,
  INVOICE_FIELD,
  PI_MARGIN,
  SELLER_FIELD,
  type InfoFieldMetrics,
} from "@/lib/proforma/layout";
import {
  buildProformaTopInformation,
  type ProformaTopInformationData,
  type ProformaTopInformationInput,
  type TopInfoAddressField,
  type TopInfoMetaField,
  type TopInfoPartyField,
} from "@/lib/proforma/topInformationModel";

function pt(n: number): string {
  return `${n}pt`;
}

function AlignedFieldRow({
  label,
  metrics,
  labelClassName,
  valueClassName,
  valueStyle,
  children,
  rowClassName,
}: {
  label: string;
  metrics: InfoFieldMetrics;
  labelClassName: string;
  valueClassName: string;
  valueStyle?: CSSProperties;
  children: ReactNode;
  rowClassName?: string;
}) {
  return (
    <div
      className={rowClassName ?? "relative mb-[1.5pt]"}
      style={{ lineHeight: 1.18, minHeight: pt(10) }}
    >
      <p
        className={labelClassName}
        style={{
          position: "absolute",
          left: 0,
          width: pt(metrics.labelWidth),
          textAlign: "right",
          lineHeight: 1.18,
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        aria-hidden
        className={labelClassName}
        style={{
          position: "absolute",
          left: pt(metrics.colonX),
          lineHeight: 1.18,
          margin: 0,
        }}
      >
        :
      </p>
      <div
        className={valueClassName}
        style={{
          marginLeft: pt(metrics.valueX),
          lineHeight: 1.18,
          ...valueStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SellerPartyField({
  field,
  metrics,
}: {
  field: TopInfoPartyField;
  metrics: InfoFieldMetrics;
}) {
  return (
    <AlignedFieldRow
      label={field.label}
      metrics={metrics}
      labelClassName="text-[8.5pt] font-bold text-slate-500"
      valueClassName="min-w-0 break-words text-[8.5pt] font-normal text-[#1E293B]"
      valueStyle={
        field.maxLines
          ? {
              display: "-webkit-box",
              WebkitLineClamp: field.maxLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }
          : undefined
      }
    >
      {field.value || "—"}
    </AlignedFieldRow>
  );
}

function SellerAddressField({
  field,
  metrics,
}: {
  field: TopInfoAddressField;
  metrics: InfoFieldMetrics;
}) {
  const shown = field.lines.slice(0, 5);
  return (
    <AlignedFieldRow
      label={field.label}
      metrics={metrics}
      labelClassName="text-[8.5pt] font-bold text-slate-500"
      valueClassName="min-w-0 text-[8.5pt] font-normal text-[#1E293B]"
    >
      {(shown.length ? shown : ["—"]).map((line, i) => (
        <span key={i} className="block break-words">
          {line}
        </span>
      ))}
    </AlignedFieldRow>
  );
}

function BuyerField({
  field,
  metrics,
}: {
  field: TopInfoPartyField;
  metrics: InfoFieldMetrics;
}) {
  return (
    <AlignedFieldRow
      label={field.label}
      metrics={metrics}
      labelClassName="text-[8.5pt] font-bold text-slate-500"
      valueClassName="min-w-0 break-words text-[8.5pt] font-normal text-[#1E293B]"
      valueStyle={
        field.maxLines
          ? {
              display: "-webkit-box",
              WebkitLineClamp: field.maxLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }
          : undefined
      }
    >
      {field.value || "—"}
    </AlignedFieldRow>
  );
}

function InvoiceMetaField({
  field,
  metrics,
}: {
  field: TopInfoMetaField;
  metrics: InfoFieldMetrics;
}) {
  return (
    <AlignedFieldRow
      label={field.label}
      metrics={metrics}
      rowClassName="relative mb-[1pt]"
      labelClassName="text-[9pt] font-semibold text-slate-500"
      valueClassName="min-w-0 truncate text-[9.5pt] font-normal text-[#1E293B]"
    >
      {field.value || "—"}
    </AlignedFieldRow>
  );
}

function ColumnTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-[4pt] text-[9.5pt] font-bold text-[#1E293B]">{children}</p>
  );
}

/** Renders from pre-built shared data (preferred). */
export function ProformaTopInformationView({
  data,
}: {
  data: ProformaTopInformationData;
}) {
  return (
    <div
      data-proforma-top-info="seller-buyer-invoice-cols"
      style={{
        position: "absolute",
        left: pt(PI_MARGIN),
        right: pt(PI_MARGIN),
        top: pt(INFO_TOP),
        height: pt(INFO_HEIGHT),
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        className="grid h-full grid-cols-3 gap-2 border-b border-[#D4AF37]"
        style={{
          lineHeight: 1.18,
          minHeight: "100%",
          paddingBottom: pt(6.5),
          boxSizing: "border-box",
        }}
      >
        {/* Left — Seller */}
        <div style={{ lineHeight: 1.18, overflow: "hidden" }}>
          <ColumnTitle>{data.seller.title}</ColumnTitle>
          {data.seller.fields.map((f, i) =>
            f.kind === "address" ? (
              <SellerAddressField key={i} field={f} metrics={SELLER_FIELD} />
            ) : (
              <SellerPartyField key={i} field={f} metrics={SELLER_FIELD} />
            )
          )}
        </div>

        {/* Middle — Buyer */}
        <div style={{ lineHeight: 1.18, overflow: "hidden" }}>
          <ColumnTitle>{data.buyer.title}</ColumnTitle>
          {data.buyer.fields.map((f, i) => (
            <BuyerField key={i} field={f} metrics={BUYER_FIELD} />
          ))}
        </div>

        {/* Right — Invoice Information */}
        <div style={{ lineHeight: 1.18, overflow: "hidden" }}>
          <ColumnTitle>{data.invoice.title}</ColumnTitle>
          {data.invoice.fields.map((f, i) => (
            <InvoiceMetaField key={i} field={f} metrics={INVOICE_FIELD} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Shared entry used by AdminProformaPreview — builds model then renders. */
export default function ProformaTopInformation({
  input,
}: {
  input: ProformaTopInformationInput;
}) {
  const data = buildProformaTopInformation(input);
  return <ProformaTopInformationView data={data} />;
}
