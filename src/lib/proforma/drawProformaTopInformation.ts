/**
 * PDF drawer for the shared Proforma top-information band.
 * Three horizontal columns: Seller | Buyer | Invoice Information.
 *
 * Labels LEFT aligned. Colon X = longest label width in the column.
 * Values start immediately after ": ".
 * Same layoutAlignedColumn metrics as Preview.
 */

import type { jsPDF } from "jspdf";
import {
  alignedValueMaxWidth,
  FIELD_COLON_SUFFIX,
  layoutAlignedColumn,
  layoutImmediateColon,
  type AlignedColumnLayout,
} from "@/lib/proforma/alignedLabelValue";
import {
  INFO_BOTTOM,
  INFO_HEIGHT,
  INFO_TOP,
  infoColLeft,
  infoColWidth,
  PI_CONTENT_W,
  PI_MARGIN,
} from "@/lib/proforma/layout";
import { setProformaFont } from "@/lib/proforma/pdfFonts";
import type {
  ProformaTopInformationData,
  TopInfoAddressField,
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
const PT_LINE_HEIGHT = 1.12;
const INFO_BOTTOM_PAD = 4;

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

function measureValueHeight(
  doc: Pdf,
  value: string,
  valueW: number,
  maxLines = 99,
  fontSize = PT_PARTY
): number {
  const lineGap = fontSize * (PT_LINE_HEIGHT - 1);
  setProformaFont(doc, "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(
    (value || "—").trim() || "—",
    valueW
  ) as string[];
  const n = Math.min(maxLines, Math.max(1, lines.length));
  return Math.max(fontSize * PT_LINE_HEIGHT, n * (fontSize + lineGap)) + 1.2;
}

/**
 * Left-aligned label + colon at longest-label edge + value after ": ".
 * Seller only.
 */
function drawAlignedField(
  doc: Pdf,
  label: string,
  value: string,
  colLeft: number,
  y: number,
  layout: AlignedColumnLayout,
  columnWidth: number,
  opts?: {
    labelSize?: number;
    valueSize?: number;
    maxLines?: number;
    ellipsis?: boolean;
    rowStep?: number;
  }
): number {
  const labelSize = opts?.labelSize ?? PT_LABEL;
  const valueSize = opts?.valueSize ?? PT_PARTY;
  const lineGap = valueSize * (PT_LINE_HEIGHT - 1);
  const colonX = colLeft + layout.colonX;
  const valueX = colLeft + layout.valueX;
  const valueW = alignedValueMaxWidth(layout, columnWidth);

  setProformaFont(doc, "bold");
  doc.setFontSize(labelSize);
  doc.setTextColor(...SLATE);
  doc.text(label, colLeft, y);
  doc.text(FIELD_COLON_SUFFIX, colonX, y);

  const textH = putText(doc, value || "—", valueX, y, {
    fontSize: valueSize,
    bold: false,
    maxWidth: valueW,
    lineGap,
    maxLines: opts?.maxLines ?? 99,
    ellipsis: opts?.ellipsis !== false,
  });

  if (opts?.rowStep != null) return opts.rowStep;
  return Math.max(valueSize * PT_LINE_HEIGHT, textH) + 1.2;
}

/**
 * Colon immediately after this label (Buyer / Invoice Information).
 * Example: "Destination Port / 目的港: Douala"
 */
function drawImmediateColonField(
  doc: Pdf,
  label: string,
  value: string,
  colLeft: number,
  y: number,
  columnWidth: number,
  opts?: {
    labelSize?: number;
    valueSize?: number;
    maxLines?: number;
    ellipsis?: boolean;
    rowStep?: number;
  }
): number {
  const labelSize = opts?.labelSize ?? PT_LABEL;
  const valueSize = opts?.valueSize ?? PT_PARTY;
  const lineGap = valueSize * (PT_LINE_HEIGHT - 1);
  const layout = layoutImmediateColon(label, labelSize);
  const colonX = colLeft + layout.colonX;
  const valueX = colLeft + layout.valueX;
  const valueW = alignedValueMaxWidth(layout, columnWidth);

  setProformaFont(doc, "bold");
  doc.setFontSize(labelSize);
  doc.setTextColor(...SLATE);
  doc.text(label, colLeft, y);
  doc.text(FIELD_COLON_SUFFIX, colonX, y);

  const textH = putText(doc, value || "—", valueX, y, {
    fontSize: valueSize,
    bold: false,
    maxWidth: valueW,
    lineGap,
    maxLines: opts?.maxLines ?? 99,
    ellipsis: opts?.ellipsis === true,
  });

  if (opts?.rowStep != null) return opts.rowStep;
  return Math.max(valueSize * PT_LINE_HEIGHT, textH) + 1.2;
}

function drawAlignedAddress(
  doc: Pdf,
  field: TopInfoAddressField,
  colLeft: number,
  y: number,
  layout: AlignedColumnLayout,
  maxLines: number
): number {
  const fontSize = PT_PARTY;
  const lineGap = fontSize * (PT_LINE_HEIGHT - 1);
  const step = fontSize + lineGap;
  const colonX = colLeft + layout.colonX;
  const valueX = colLeft + layout.valueX;
  const valueW = alignedValueMaxWidth(layout, infoColWidth(0));

  setProformaFont(doc, "bold");
  doc.setFontSize(PT_LABEL);
  doc.setTextColor(...SLATE);
  doc.text(field.label, colLeft, y);
  doc.text(FIELD_COLON_SUFFIX, colonX, y);

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
    doc.text(w, valueX, yy);
    yy += step;
  }
  return drawn.length * step + 1.2;
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
  const col1 = infoColLeft(0);
  const col2 = infoColLeft(1);
  const col3 = infoColLeft(2);
  const infoTop = INFO_TOP;
  const infoLimit = INFO_TOP + INFO_HEIGHT - INFO_BOTTOM_PAD;

  const sellerLayout = layoutAlignedColumn(
    data.seller.fields.map((f) => f.label),
    PT_LABEL
  );

  const sellerColW = infoColWidth(0);
  const buyerColW = infoColWidth(1);
  const invoiceColW = infoColWidth(2);

  const sellerValueW = alignedValueMaxWidth(sellerLayout, sellerColW);

  drawSectionTitle(doc, data.seller.title, col1, infoTop, sellerColW - 4);
  drawSectionTitle(doc, data.buyer.title, col2, infoTop, buyerColW - 4);
  drawSectionTitle(doc, data.invoice.title, col3, infoTop, invoiceColW - 4);

  const bodyY = infoTop + 12;

  // —— Left: Seller ——
  let y1 = bodyY;
  const partyFields = data.seller.fields.filter(
    (f): f is TopInfoPartyField => f.kind === "party"
  );
  const addressField = data.seller.fields.find(
    (f): f is TopInfoAddressField => f.kind === "address"
  );

  let reserved = 0;
  for (const f of partyFields) {
    if (f.label.startsWith("Company")) continue;
    reserved += measureValueHeight(
      doc,
      f.value,
      sellerValueW,
      f.maxLines ?? 99
    );
  }
  const companyField = partyFields.find((f) => f.label.startsWith("Company"));
  if (companyField) {
    reserved += measureValueHeight(
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
      y1 += drawAlignedAddress(
        doc,
        field,
        col1,
        y1,
        sellerLayout,
        addressMaxLines
      );
    } else {
      y1 += drawAlignedField(
        doc,
        field.label,
        field.value,
        col1,
        y1,
        sellerLayout,
        sellerColW,
        {
          maxLines: field.maxLines ?? 99,
          ellipsis: false,
        }
      );
    }
  }
  void y1;

  // —— Middle: Buyer (colon immediately after each label) ——
  let y2 = bodyY;
  for (const field of data.buyer.fields) {
    y2 += drawImmediateColonField(
      doc,
      field.label,
      field.value,
      col2,
      y2,
      buyerColW,
      {
        maxLines: field.maxLines ?? 99,
        ellipsis: false,
      }
    );
  }
  void y2;

  // —— Right: Invoice Information (full values, no ellipsis) ——
  let y3 = bodyY;
  for (const field of data.invoice.fields) {
    y3 += drawImmediateColonField(
      doc,
      field.label,
      field.value,
      col3,
      y3,
      invoiceColW,
      {
        labelSize: PT_META_LABEL,
        valueSize: PT_META_VALUE,
        maxLines: 3,
        ellipsis: false,
      }
    );
  }
  void y3;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, INFO_BOTTOM - 2, MARGIN + CONTENT_W, INFO_BOTTOM - 2);
}
