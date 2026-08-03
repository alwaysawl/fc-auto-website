/**
 * PDF drawer for the shared Proforma top-information stack.
 * Uses the same ProformaTopInformationData as the React preview component.
 * Vertical order only: Seller → Buyer → Invoice Information.
 */

import type { jsPDF } from "jspdf";
import {
  BUYER_TOP,
  INFO_BOTTOM,
  INVOICE_INFO_TOP,
  INVOICE_LABEL_VALUE_GAP,
  INVOICE_LABEL_WIDTH,
  PI_CONTENT_W,
  PI_MARGIN,
  SELLER_TOP,
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
  doc.text(field.label, x, y);
  oneLine(doc, field.value, x + labelW + gap, y, valueW, {
    fontSize: PT_META_VALUE,
    bold: false,
    color: BLACK,
  });
  return 11.5;
}

function drawSectionTitle(doc: Pdf, title: string, x: number, y: number) {
  putText(doc, title, x, y, {
    fontSize: PT_SECTION,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
}

/**
 * Draw Seller → Buyer → Invoice Information (full-width stack).
 * Consumes the same data object as ProformaTopInformationView.
 */
export function drawProformaTopInformation(
  doc: Pdf,
  data: ProformaTopInformationData
): void {
  const half = CONTENT_W / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + half + 6;
  const labelW = 52;
  const leftValueW = half - labelW - 10;
  const rightValueW = half - labelW - 16;

  // 1. Seller
  let y = SELLER_TOP + 9;
  drawSectionTitle(doc, data.seller.title, leftX, y);
  y += 12;
  const sellerLeftTop = y;
  let ly = y;
  for (const field of data.seller.left) {
    if (field.kind === "address") {
      ly += drawAddressField(
        doc,
        field,
        leftX,
        ly,
        labelW,
        leftValueW,
        5
      );
    } else {
      ly += drawPartyField(doc, field, leftX, ly, labelW, leftValueW);
    }
  }
  let ry = sellerLeftTop;
  for (const field of data.seller.right) {
    ry += drawPartyField(doc, field, rightX, ry, labelW, rightValueW);
  }
  void Math.max(ly, ry);

  // 2. Buyer
  y = BUYER_TOP + 9;
  drawSectionTitle(doc, data.buyer.title, leftX, y);
  y += 12;
  const buyerLeftTop = y;
  let byL = y;
  for (const field of data.buyer.left) {
    byL += drawPartyField(doc, field, leftX, byL, labelW, leftValueW);
  }
  let byR = buyerLeftTop;
  for (const field of data.buyer.right) {
    byR += drawPartyField(doc, field, rightX, byR, labelW, rightValueW);
  }
  void Math.max(byL, byR);

  // 3. Invoice Information
  y = INVOICE_INFO_TOP + 9;
  drawSectionTitle(doc, data.invoice.title, leftX, y);
  y += 12;

  const metaLabelW = INVOICE_LABEL_WIDTH;
  const metaGap = INVOICE_LABEL_VALUE_GAP;
  const metaColW = (CONTENT_W - 12) / 2;
  const metaValueW = metaColW - metaLabelW - metaGap - 4;

  let myL = y;
  for (const field of data.invoice.left) {
    myL += drawMetaField(
      doc,
      field,
      leftX,
      myL,
      metaLabelW,
      metaValueW,
      metaGap
    );
  }
  let myR = y;
  for (const field of data.invoice.right) {
    myR += drawMetaField(
      doc,
      field,
      rightX,
      myR,
      metaLabelW,
      metaValueW,
      metaGap
    );
  }

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, INFO_BOTTOM - 2, MARGIN + CONTENT_W, INFO_BOTTOM - 2);
}
