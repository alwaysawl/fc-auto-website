"use client";

/**
 * Shared top-information renderer for Admin Proforma Preview.
 * Three horizontal columns: Seller | Buyer | Invoice Information.
 *
 * Labels are LEFT aligned. Colon position = longest label in the column.
 * Values start immediately after ": ".
 * Geometry matches PDF via alignedLabelValue.ts.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  alignedValueMaxWidth,
  FIELD_COLON_SUFFIX,
  layoutAlignedColumn,
  type AlignedColumnLayout,
} from "@/lib/proforma/alignedLabelValue";
import {
  INFO_COL_W,
  INFO_HEIGHT,
  INFO_TOP,
  PI_MARGIN,
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

const PARTY_LABEL_SIZE = 8.5;
const META_LABEL_SIZE = 9;

/**
 * One field row: left-aligned label (padded to column max) + ": " + value.
 * Uses the same layoutAlignedColumn metrics as the PDF drawer.
 */
function AlignedFieldRow({
  label,
  layout,
  labelClassName,
  valueClassName,
  valueStyle,
  children,
  rowClassName,
}: {
  label: string;
  layout: AlignedColumnLayout;
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
          width: pt(layout.maxLabelWidth),
          textAlign: "left",
          lineHeight: 1.18,
          margin: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </p>
      <p
        aria-hidden
        className={labelClassName}
        style={{
          position: "absolute",
          left: pt(layout.colonX),
          lineHeight: 1.18,
          margin: 0,
          whiteSpace: "pre",
        }}
      >
        {FIELD_COLON_SUFFIX}
      </p>
      <div
        className={valueClassName}
        style={{
          marginLeft: pt(layout.valueX),
          maxWidth: pt(alignedValueMaxWidth(layout, INFO_COL_W)),
          lineHeight: 1.18,
          ...valueStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PartyOrBuyerField({
  field,
  layout,
}: {
  field: TopInfoPartyField;
  layout: AlignedColumnLayout;
}) {
  return (
    <AlignedFieldRow
      label={field.label}
      layout={layout}
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

function AddressField({
  field,
  layout,
}: {
  field: TopInfoAddressField;
  layout: AlignedColumnLayout;
}) {
  const shown = field.lines.slice(0, 5);
  return (
    <AlignedFieldRow
      label={field.label}
      layout={layout}
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

function InvoiceMetaField({
  field,
  layout,
}: {
  field: TopInfoMetaField;
  layout: AlignedColumnLayout;
}) {
  return (
    <AlignedFieldRow
      label={field.label}
      layout={layout}
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

function sellerLabels(data: ProformaTopInformationData): string[] {
  return data.seller.fields.map((f) => f.label);
}

function buyerLabels(data: ProformaTopInformationData): string[] {
  return data.buyer.fields.map((f) => f.label);
}

function invoiceLabels(data: ProformaTopInformationData): string[] {
  return data.invoice.fields.map((f) => f.label);
}

/** Renders from pre-built shared data (preferred). */
export function ProformaTopInformationView({
  data,
}: {
  data: ProformaTopInformationData;
}) {
  const sellerLayout = layoutAlignedColumn(sellerLabels(data), PARTY_LABEL_SIZE);
  const buyerLayout = layoutAlignedColumn(buyerLabels(data), PARTY_LABEL_SIZE);
  const invoiceLayout = layoutAlignedColumn(
    invoiceLabels(data),
    META_LABEL_SIZE
  );

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
        <div style={{ lineHeight: 1.18, overflow: "hidden" }}>
          <ColumnTitle>{data.seller.title}</ColumnTitle>
          {data.seller.fields.map((f, i) =>
            f.kind === "address" ? (
              <AddressField key={i} field={f} layout={sellerLayout} />
            ) : (
              <PartyOrBuyerField key={i} field={f} layout={sellerLayout} />
            )
          )}
        </div>

        <div style={{ lineHeight: 1.18, overflow: "hidden" }}>
          <ColumnTitle>{data.buyer.title}</ColumnTitle>
          {data.buyer.fields.map((f, i) => (
            <PartyOrBuyerField key={i} field={f} layout={buyerLayout} />
          ))}
        </div>

        <div style={{ lineHeight: 1.18, overflow: "hidden" }}>
          <ColumnTitle>{data.invoice.title}</ColumnTitle>
          {data.invoice.fields.map((f, i) => (
            <InvoiceMetaField key={i} field={f} layout={invoiceLayout} />
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
