"use client";

/**
 * Shared top-information renderer for Admin Proforma Preview.
 * Three horizontal columns on one row:
 *   Left:   Seller / 卖方
 *   Middle: Buyer / 买方
 *   Right:  Invoice Information / 发票信息
 */

import type { ReactNode } from "react";
import {
  BUYER_LABEL_VALUE_GAP,
  BUYER_LABEL_WIDTH,
  INFO_HEIGHT,
  INFO_TOP,
  INVOICE_LABEL_VALUE_GAP,
  INVOICE_LABEL_WIDTH,
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

function PartyField({ field }: { field: TopInfoPartyField }) {
  return (
    <p className="mb-[1.5pt] text-[8.5pt]" style={{ lineHeight: 1.18 }}>
      <span className="font-bold text-slate-500">{field.label}: </span>
      <span
        className="break-words font-normal text-[#1E293B]"
        style={
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
        {field.value}
      </span>
    </p>
  );
}

/** Buyer fields: fixed label column + gap so bilingual labels never overlap values. */
function BuyerField({ field }: { field: TopInfoPartyField }) {
  return (
    <div
      className="mb-[1.5pt] grid items-start"
      style={{
        gridTemplateColumns: `${BUYER_LABEL_WIDTH}pt 1fr`,
        columnGap: pt(BUYER_LABEL_VALUE_GAP),
        lineHeight: 1.18,
      }}
    >
      <p className="text-[8.5pt] font-bold leading-[1.18] text-slate-500">
        {field.label}:
      </p>
      <p
        className="min-w-0 break-words text-[8.5pt] font-normal leading-[1.18] text-[#1E293B]"
        style={
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
      </p>
    </div>
  );
}

function AddressField({ field }: { field: TopInfoAddressField }) {
  const shown = field.lines.slice(0, 5);
  return (
    <div className="mb-[1.5pt] text-[8.5pt]" style={{ lineHeight: 1.18 }}>
      <span className="font-bold text-slate-500">{field.label}: </span>
      <span className="inline-block align-top font-normal text-[#1E293B]">
        {(shown.length ? shown : ["—"]).map((line, i) => (
          <span key={i} className="block break-words">
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

function MetaField({ field }: { field: TopInfoMetaField }) {
  return (
    <div
      className="mb-[1pt] grid items-baseline"
      style={{
        gridTemplateColumns: `${INVOICE_LABEL_WIDTH}pt 1fr`,
        columnGap: pt(INVOICE_LABEL_VALUE_GAP),
      }}
    >
      <p className="text-[9pt] font-semibold leading-[1.18] text-slate-500">
        {field.label}
      </p>
      <p className="min-w-0 truncate text-[9.5pt] font-normal leading-[1.18] text-[#1E293B]">
        {field.value}
      </p>
    </div>
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
              <AddressField key={i} field={f} />
            ) : (
              <PartyField key={i} field={f} />
            )
          )}
        </div>

        {/* Middle — Buyer */}
        <div style={{ lineHeight: 1.18, overflow: "hidden" }}>
          <ColumnTitle>{data.buyer.title}</ColumnTitle>
          {data.buyer.fields.map((f, i) => (
            <BuyerField key={i} field={f} />
          ))}
        </div>

        {/* Right — Invoice Information */}
        <div className="space-y-[1pt]" style={{ overflow: "hidden" }}>
          <ColumnTitle>{data.invoice.title}</ColumnTitle>
          {data.invoice.fields.map((f, i) => (
            <MetaField key={i} field={f} />
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
