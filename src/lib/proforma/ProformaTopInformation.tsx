"use client";

/**
 * Shared top-information renderer for Admin Proforma Preview.
 * Three horizontal columns: Seller | Buyer | Invoice Information.
 *
 * Seller: left-aligned labels with colon padded to the longest label.
 * Buyer / Invoice: colon immediately after each label (no shared padding).
 */

import type { CSSProperties, ReactNode } from "react";
import {
  alignedValueMaxWidth,
  FIELD_COLON_SUFFIX,
  layoutAlignedColumn,
  layoutImmediateColon,
  type AlignedColumnLayout,
} from "@/lib/proforma/alignedLabelValue";
import {
  INFO_COL_FRACTIONS,
  INFO_COL_GAP,
  INFO_HEIGHT,
  INFO_LINE_HEIGHT,
  INFO_TOP,
  PI_MARGIN,
  infoColWidth,
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
 * Seller field row: left-aligned label padded to column max + ": " + value.
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
      className={rowClassName ?? "relative mb-[1pt]"}
      style={{ lineHeight: INFO_LINE_HEIGHT, minHeight: pt(9) }}
    >
      <p
        className={labelClassName}
        style={{
          position: "absolute",
          left: 0,
          width: pt(layout.maxLabelWidth),
          textAlign: "left",
          lineHeight: INFO_LINE_HEIGHT,
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
          lineHeight: INFO_LINE_HEIGHT,
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
          maxWidth: pt(alignedValueMaxWidth(layout, infoColWidth(0))),
          lineHeight: INFO_LINE_HEIGHT,
          ...valueStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Buyer / Invoice: colon immediately after the label text. */
function ImmediateColonField({
  label,
  fontSize,
  columnWidth,
  labelClassName,
  valueClassName,
  valueStyle,
  rowClassName,
  children,
}: {
  label: string;
  fontSize: number;
  columnWidth: number;
  labelClassName: string;
  valueClassName: string;
  valueStyle?: CSSProperties;
  rowClassName?: string;
  children?: ReactNode;
}) {
  const layout = layoutImmediateColon(label, fontSize);
  return (
    <div
      className={rowClassName ?? "relative mb-[1pt]"}
      style={{ lineHeight: INFO_LINE_HEIGHT, minHeight: pt(9) }}
    >
      <p
        className={labelClassName}
        style={{
          position: "absolute",
          left: 0,
          lineHeight: INFO_LINE_HEIGHT,
          margin: 0,
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
          lineHeight: INFO_LINE_HEIGHT,
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
          maxWidth: pt(alignedValueMaxWidth(layout, columnWidth)),
          lineHeight: INFO_LINE_HEIGHT,
          ...valueStyle,
        }}
      >
        {children ?? "—"}
      </div>
    </div>
  );
}

function SellerPartyField({
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
      valueClassName={`min-w-0 text-[8.5pt] font-normal text-[#1E293B] ${
        field.maxLines === 1 ? "whitespace-nowrap" : "break-words"
      }`}
    >
      {field.value || "—"}
    </AlignedFieldRow>
  );
}

function SellerAddressField({
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

function BuyerField({ field }: { field: TopInfoPartyField }) {
  return (
    <ImmediateColonField
      label={field.label}
      fontSize={PARTY_LABEL_SIZE}
      columnWidth={infoColWidth(1)}
      labelClassName="text-[8.5pt] font-bold text-slate-500"
      valueClassName="min-w-0 break-words text-[8.5pt] font-normal text-[#1E293B]"
    >
      {field.value || "—"}
    </ImmediateColonField>
  );
}

function InvoiceMetaField({ field }: { field: TopInfoMetaField }) {
  return (
    <ImmediateColonField
      label={field.label}
      fontSize={META_LABEL_SIZE}
      columnWidth={infoColWidth(2)}
      rowClassName="relative mb-[1pt]"
      labelClassName="text-[9pt] font-semibold text-slate-500"
      valueClassName="min-w-0 break-words text-[9.5pt] font-normal text-[#1E293B]"
    >
      {field.value || "—"}
    </ImmediateColonField>
  );
}

function ColumnTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-[2.5pt] text-[9.5pt] font-bold text-[#1E293B]">{children}</p>
  );
}

/** Renders from pre-built shared data (preferred). */
export function ProformaTopInformationView({
  data,
}: {
  data: ProformaTopInformationData;
}) {
  const sellerLayout = layoutAlignedColumn(
    data.seller.fields.map((f) => f.label),
    PARTY_LABEL_SIZE
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
        overflow: "visible",
      }}
    >
      <div
        className="grid h-full border-b border-[#D4AF37]"
        style={{
          gridTemplateColumns: INFO_COL_FRACTIONS.map((f) => `${f}fr`).join(
            " "
          ),
          columnGap: pt(INFO_COL_GAP),
          lineHeight: INFO_LINE_HEIGHT,
          minHeight: "100%",
          paddingBottom: pt(4),
          boxSizing: "border-box",
        }}
      >
        <div style={{ lineHeight: INFO_LINE_HEIGHT, overflow: "visible" }}>
          <ColumnTitle>{data.seller.title}</ColumnTitle>
          {data.seller.fields.map((f, i) =>
            f.kind === "address" ? (
              <SellerAddressField key={i} field={f} layout={sellerLayout} />
            ) : (
              <SellerPartyField key={i} field={f} layout={sellerLayout} />
            )
          )}
        </div>

        <div style={{ lineHeight: INFO_LINE_HEIGHT, overflow: "visible" }}>
          <ColumnTitle>{data.buyer.title}</ColumnTitle>
          {data.buyer.fields.map((f, i) => (
            <BuyerField key={i} field={f} />
          ))}
        </div>

        <div style={{ lineHeight: INFO_LINE_HEIGHT, overflow: "visible" }}>
          <ColumnTitle>{data.invoice.title}</ColumnTitle>
          {data.invoice.fields.map((f, i) => (
            <InvoiceMetaField key={i} field={f} />
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
