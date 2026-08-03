/**
 * PDF drawer for the shared Proforma top-information band.
 * Three horizontal columns: Seller | Buyer | Invoice Information.
 * Uses the same ProformaTopInformationData as the React preview.
 */

import type { jsPDF } from "jspdf";
import {
  INFO_BOTTOM,
  INFO_HEIGHT,
  INFO_TOP,
  INVOICE_LABEL_VALUE_GAP,
  INVOICE_LABEL_WIDTH,
  PI_CONTENT_W,
  PI_MARGIN,
} from "@/lib/proforma/layout";
import { setProformaFont } from "@/lib/proforma/pdfFonts";
import type {
  ProformaTopInformationData,
  TopInfoAddressField,
  TopInfoMetaField,
  TopInfoPartyField,
} from "@/lib/proforma/topInformationModel";

type Pdf = jsPDF;

const NAVY: [number, number, number] = [30, 41, 59];
const GOLD: [number, number, number] = [212, 175, 55];
const SLATE: [number, number, number] = [71, 85, 105];
const BLACK: [number, number, number] = [15, 23, 42];

const PT_SECTION = 9.5;
const PT_LABEL = 8.5;
const PT_PARTY = 8.5;
const PT_META_LABEL = 9;
const PT_META_VALUE = 9.5;
const PT_LINE_HEIGHT = 1.18;
const INFO_BOTTOM_PAD = 6.5;

const MARGIN = PI_MARGIN;
const CONTENT_W = PI_CONTENT_W;

function putText(
  doc: Pdf,
  text: string,
  x: number,
  y: number,
  opts?: {
    fontSize?: number;
    color?: [number, number, number];
    bold?: boolean;
    maxWidth?: number;
    lineGap?: number;
    maxLines?: number;
    ellipsis?: boolean;
  }
): number {
  const fontSize = opts?.fontSize ?? 8.5;
  const color = opts?.color ?? BLACK;
  const maxWidth = opts?.maxWidth ?? CONTENT_W;
  const lineGap = opts?.lineGap ?? 2.2;
  const maxLines = opts?.maxLines ?? 99;
  const useEllipsis = opts?.ellipsis !== false;
  if (!text) return fontSize * 0.2;

  setProformaFont(doc, opts?.bold ? "bold" : "normal");
  doc.setTextColor(...color);
  doc.setFontSize(fontSize);
  let lines = doc.splitTextToSize(text, maxWidth) as string[];
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    if (useEllipsis) {
      const last = lines[maxLines - 1] ?? "";
      lines[maxLines - 1] =
        last.length > 1
          ? `${last.slice(0, Math.max(1, last.length - 1))}…`
          : "…";
    }
  }
  doc.text(lines, x, y);
  return lines.length * (fontSize + lineGap);
}

function oneLine(
  doc: Pdf,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts?: {
    fontSize?: number;
    bold?: boolean;
    color?: [number, number, number];
  }
) {
  const fontSize = opts?.fontSize ?? 7.5;
  const color = opts?.color ?? BLACK;
  setProformaFont(doc, opts?.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const raw = (text || "").trim() || "—";
  let out = raw;
  if (doc.getTextWidth(out) > maxWidth) {
    while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxWidth) {
      out = out.slice(0, -1);
    }
    out = `${out}…`;
  }
  doc.text(out, x, y);
}

function measurePartyField(
  doc: Pdf,
  value: string,
  valueW: number,
  maxLines = 99,
  fontSize = PT_PARTY
): number {
  const lineGap = fontSize * (PT_LINE_HEIGHT - 1);
  setProformaFont(doc, "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize((value || "—").trim() || "—", valueW) as string[];
  const n = Math.min(maxLines, Math.max(1, lines.length));
  return Math.max(fontSize * PT_LINE_HEIGHT, n * (fontSize + lineGap)) + 1.2;
}

function drawPartyField(
  doc: Pdf,
  field: TopInfoPartyField,
  x: number,
  y: number,
  labelW: number,
  valueW: number
): number {
  const fontSize = PT_PARTY;
  const lineGap = fontSize * (PT_LINE_HEIGHT - 1);
  setProformaFont(doc, "bold");
  doc.setFontSize(PT_LABEL);
  doc.setTextColor(...SLATE);
  doc.text(`${field.label}:`, x, y);
  const textH = putText(doc, field.value, x + labelW, y, {
    fontSize,
    bold: false,
    maxWidth: valueW,
    lineGap,
    maxLines: field.maxLines ?? 99,
    ellipsis: false,
  });
  return Math.max(fontSize * PT_LINE_HEIGHT, textH) + 1.2;
}

function drawAddressField(
  doc: Pdf,
  field: TopInfoAddressField,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
  maxLines: number
): number {
  const fontSize = PT_PARTY;
  const lineGap = fontSize * (PT_LINE_HEIGHT - 1);
  const step = fontSize + lineGap;
  setProformaFont(doc, "bold");
  doc.setFontSize(PT_LABEL);
  doc.setTextColor(...SLATE);
  doc.text(`${field.label}:`, x, y);

  setProformaFont(doc, "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...BLACK);

  const drawn: string[] = [];
  for (const line of field.lines) {
    const wrapped = doc.splitTextToSize(line, valueW) as string[];
    for (const w of wrapped) {
      if (drawn.length >= maxLines) break;
      drawn.push(w);
    }
    if (drawn.length >= maxLines) break;
  }
  if (drawn.length === 0) drawn.push("—");

  let yy = y;
  for (const w of drawn) {
    doc.text(w, x + labelW, yy);
    yy += step;
  }
  return drawn.length * step + 1.2;
}

function drawMetaField(
  doc: Pdf,
  field: TopInfoMetaField,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
  gap: number
): number {
  setProformaFont(doc, "bold");
  doc.setFontSize(PT_META_LABEL);
  doc.setTextColor(...SLATE);
  // Keep bilingual label inside the fixed label column (no overlap into value).
  oneLine(doc, field.label, x, y, labelW, {
    fontSize: PT_META_LABEL,
    bold: true,
    color: SLATE,
  });
  oneLine(doc, field.value, x + labelW + gap, y, valueW, {
    fontSize: PT_META_VALUE,
    bold: false,
    color: BLACK,
  });
  return 12.5;
}

function drawSectionTitle(
  doc: Pdf,
  title: string,
  x: number,
  y: number,
  maxWidth: number
) {
  putText(doc, title, x, y, {
    fontSize: PT_SECTION,
    bold: true,
    color: NAVY,
    maxWidth,
  });
}

/**
 * Draw Seller | Buyer | Invoice Information (one horizontal row).
 */
export function drawProformaTopInformation(
  doc: Pdf,
  data: ProformaTopInformationData
): void {
  const colW = CONTENT_W / 3;
  const col1 = MARGIN;
  const col2 = MARGIN + colW;
  const col3 = MARGIN + colW * 2;
  const infoTop = INFO_TOP;
  const infoLimit = INFO_TOP + INFO_HEIGHT - INFO_BOTTOM_PAD;

  const sellerLabelW = 70;
  const sellerValueW = colW - sellerLabelW - 10;
  const buyerLabelW = 78;
  const buyerValueW = colW - buyerLabelW - 10;
  const metaLabelW = INVOICE_LABEL_WIDTH;
  const metaGap = INVOICE_LABEL_VALUE_GAP;
  const metaValueW = Math.max(36, colW - metaLabelW - metaGap - 8);

  // Column titles on the same baseline
  drawSectionTitle(doc, data.seller.title, col1, infoTop, colW - 8);
  drawSectionTitle(doc, data.buyer.title, col2, infoTop, colW - 8);
  drawSectionTitle(doc, data.invoice.title, col3, infoTop, colW - 8);

  const bodyY = infoTop + 12;

  // —— Left: Seller ——
  let y1 = bodyY;
  const partyFields = data.seller.fields.filter(
    (f): f is TopInfoPartyField => f.kind === "party"
  );
  const addressField = data.seller.fields.find(
    (f): f is TopInfoAddressField => f.kind === "address"
  );

  // Budget address lines so phone/email/website stay visible
  let reserved = 0;
  for (const f of partyFields) {
    if (f.label.startsWith("Company")) continue;
    reserved += measurePartyField(
      doc,
      f.value,
      sellerValueW,
      f.maxLines ?? 99
    );
  }
  const companyField = partyFields.find((f) => f.label.startsWith("Company"));
  if (companyField) {
    reserved += measurePartyField(
      doc,
      companyField.value,
      sellerValueW,
      companyField.maxLines ?? 3
    );
  }

  const addressBudget = Math.max(
    PT_PARTY * PT_LINE_HEIGHT + 1.5,
    infoLimit - (bodyY + reserved)
  );
  const addrLineH = PT_PARTY * PT_LINE_HEIGHT;
  const addressMaxLines = Math.max(
    1,
    Math.min(
      5,
      Math.floor(addressBudget / addrLineH),
      addressField?.lines.length || 1
    )
  );

  for (const field of data.seller.fields) {
    if (field.kind === "address") {
      y1 += drawAddressField(
        doc,
        field,
        col1,
        y1,
        sellerLabelW,
        sellerValueW,
        addressMaxLines
      );
    } else {
      y1 += drawPartyField(doc, field, col1, y1, sellerLabelW, sellerValueW);
    }
  }
  void y1;

  // —— Middle: Buyer ——
  let y2 = bodyY;
  for (const field of data.buyer.fields) {
    y2 += drawPartyField(doc, field, col2, y2, buyerLabelW, buyerValueW);
  }
  void y2;

  // —— Right: Invoice Information (label | value, no overlap) ——
  let y3 = bodyY;
  for (const field of data.invoice.fields) {
    y3 += drawMetaField(
      doc,
      field,
      col3,
      y3,
      metaLabelW,
      metaValueW,
      metaGap
    );
  }
  void y3;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, INFO_BOTTOM - 2, MARGIN + CONTENT_W, INFO_BOTTOM - 2);
}
