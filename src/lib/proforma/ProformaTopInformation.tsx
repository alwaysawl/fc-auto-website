"use client";

/**
 * Shared top-information renderer for Admin Proforma Preview.
 * Full-width vertical stack only:
 *   1. Seller / 卖方
 *   2. Buyer / 买方
 *   3. Invoice Information / 发票信息
 * No three-column (Invoice | Seller | Buyer) layout.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  BUYER_HEIGHT,
  INFO_HEIGHT,
  INVOICE_INFO_HEIGHT,
  INVOICE_LABEL_VALUE_GAP,
  INVOICE_LABEL_WIDTH,
  PI_MARGIN,
  SELLER_HEIGHT,
  SELLER_TOP,
  TOP_SECTION_GAP,
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

function PartyField({
  field,
}: {
  field: TopInfoPartyField;
}) {
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
      className="mb-[1.5pt] grid items-baseline"
      style={{
        gridTemplateColumns: `${INVOICE_LABEL_WIDTH}pt 1fr`,
        columnGap: pt(INVOICE_LABEL_VALUE_GAP),
      }}
    >
      <p className="text-[9pt] font-semibold leading-[1.18] text-slate-500">
        {field.label}
      </p>
      <p className="truncate text-[9.5pt] font-normal leading-[1.18] text-[#1E293B]">
        {field.value}
      </p>
    </div>
  );
}

function TwoCol({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function Section({
  title,
  height,
  children,
  borderBottom,
}: {
  title: string;
  height: number;
  children: ReactNode;
  borderBottom?: boolean;
}) {
  const style: CSSProperties = {
    height: pt(height),
    lineHeight: 1.18,
    boxSizing: "border-box",
    overflow: "hidden",
    ...(borderBottom
      ? {
          borderBottom: "1px solid #D4AF37",
          paddingBottom: pt(4),
        }
      : null),
  };
  return (
    <section style={style}>
      <p className="mb-[3pt] text-[9.5pt] font-bold text-[#1E293B]">{title}</p>
      {children}
    </section>
  );
}

function Gap() {
  return <div style={{ height: pt(TOP_SECTION_GAP), flexShrink: 0 }} aria-hidden />;
}

/** Renders from pre-built shared data (preferred). */
export function ProformaTopInformationView({
  data,
}: {
  data: ProformaTopInformationData;
}) {
  return (
    <div
      data-proforma-top-info="seller-buyer-invoice-stack"
      style={{
        position: "absolute",
        left: pt(PI_MARGIN),
        right: pt(PI_MARGIN),
        top: pt(SELLER_TOP),
        height: pt(INFO_HEIGHT),
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Section title={data.seller.title} height={SELLER_HEIGHT}>
        <TwoCol
          left={data.seller.left.map((f, i) =>
            f.kind === "address" ? (
              <AddressField key={i} field={f} />
            ) : (
              <PartyField key={i} field={f} />
            )
          )}
          right={data.seller.right.map((f, i) => (
            <PartyField key={i} field={f} />
          ))}
        />
      </Section>
      <Gap />
      <Section title={data.buyer.title} height={BUYER_HEIGHT}>
        <TwoCol
          left={data.buyer.left.map((f, i) => (
            <PartyField key={i} field={f} />
          ))}
          right={data.buyer.right.map((f, i) => (
            <PartyField key={i} field={f} />
          ))}
        />
      </Section>
      <Gap />
      <Section
        title={data.invoice.title}
        height={INVOICE_INFO_HEIGHT}
        borderBottom
      >
        <TwoCol
          left={data.invoice.left.map((f, i) => (
            <MetaField key={i} field={f} />
          ))}
          right={data.invoice.right.map((f, i) => (
            <MetaField key={i} field={f} />
          ))}
        />
      </Section>
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
