/**
 * Fixed one-page A4 Proforma Invoice PDF.
 * Uses the shared explicit coordinate map in layout.ts.
 * Exactly 8 visible vehicle rows — no pagination, no autoTable.
 */

import { jsPDF } from "jspdf";
import { formatUsd } from "@/lib/admin/proforma/money";
import type {
  CompanySnapshot,
  PaymentAccountSnapshot,
  ProformaCharge,
  ProformaDetail,
  ProformaItem,
  TermSnapshot,
} from "@/lib/admin/proforma/types";
import {
  CHARGES_HEIGHT,
  CHARGES_TOP,
  FOOTER_TOP,
  HEADER_BOTTOM,
  HEADER_TOP,
  INFO_HEIGHT,
  INFO_TOP,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAYMENT_HEIGHT,
  PAYMENT_TOP,
  PI_CONTENT_W,
  PI_MARGIN,
  TERMS_MAX_BOTTOM,
  TERMS_TOP,
  VEHICLE_HEADER_HEIGHT,
  VEHICLE_ROW_COUNT,
  VEHICLE_ROW_HEIGHT,
  VEHICLE_TABLE_BOTTOM,
  VEHICLE_TABLE_TOP,
  VEHICLE_TITLE_TOP,
  checkProformaOnePageFit,
  compactPaymentValue,
  vehicleRowTop,
} from "@/lib/proforma/layout";
import {
  ensureProformaFonts,
  setProformaFont,
} from "@/lib/proforma/pdfFonts";

const NAVY: [number, number, number] = [30, 41, 59];
const GOLD: [number, number, number] = [212, 175, 55];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [248, 250, 252];
const LINE: [number, number, number] = [226, 232, 240];
const BLACK: [number, number, number] = [15, 23, 42];
const WHITE: [number, number, number] = [255, 255, 255];

const MARGIN = PI_MARGIN;
const PAGE_W = PAGE_WIDTH;
const PAGE_H = PAGE_HEIGHT;
const CONTENT_W = PI_CONTENT_W;

type Pdf = jsPDF;

export type ProformaPdfSource = {
  invoiceNumber: string;
  contractNumber: string | null;
  offerDate: string;
  validityText: string | null;
  customerName: string;
  customerCompany: string | null;
  customerCountry: string | null;
  customerAddress: string | null;
  customerWhatsapp: string | null;
  customerEmail: string | null;
  destinationCountry: string | null;
  destinationPort: string | null;
  salespersonName: string;
  salespersonPhone: string;
  salespersonEmail: string;
  companySnapshot: CompanySnapshot;
  paymentSnapshot: PaymentAccountSnapshot;
  vehicleSubtotalUsd: number;
  chargesTotalUsd: number;
  totalUsd: number;
  depositUsd: number;
  balanceUsd: number;
  termsSnapshot: TermSnapshot[];
  notes: string | null;
  items: Array<
    Pick<
      ProformaItem,
      | "brand"
      | "model"
      | "year"
      | "colour"
      | "vin"
      | "unitPriceUsd"
      | "quantity"
      | "totalUsd"
      | "note"
    >
  >;
  charges: Array<
    Pick<ProformaCharge, "nameZh" | "nameEn" | "amountUsd" | "note">
  >;
};

function putText(
  doc: Pdf,
  text: string,
  x: number,
  y: number,
  opts?: {
    fontSize?: number;
    color?: [number, number, number];
    bold?: boolean;
    align?: "left" | "center" | "right";
    maxWidth?: number;
    lineGap?: number;
    maxLines?: number;
  }
): number {
  const fontSize = opts?.fontSize ?? 8.5;
  const color = opts?.color ?? BLACK;
  const maxWidth = opts?.maxWidth ?? CONTENT_W;
  const align = opts?.align ?? "left";
  const lineGap = opts?.lineGap ?? 2.2;
  const maxLines = opts?.maxLines ?? 99;
  if (!text) return fontSize * 0.2;

  setProformaFont(doc, opts?.bold ? "bold" : "normal");
  doc.setTextColor(...color);
  doc.setFontSize(fontSize);
  let lines = doc.splitTextToSize(text, maxWidth) as string[];
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] =
      last.length > 1 ? `${last.slice(0, Math.max(1, last.length - 1))}…` : "…";
  }
  doc.text(lines, x, y, { align });
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
    align?: "left" | "center" | "right";
  }
) {
  const fontSize = opts?.fontSize ?? 7.5;
  const color = opts?.color ?? BLACK;
  const align = opts?.align ?? "left";
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
  doc.text(out, x, y, { align });
}

export function buildProformaPdfFilename(invoiceNumber: string): string {
  const safe = (invoiceNumber || "proforma")
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safe || "proforma"}.pdf`;
}

function triggerPdfFileDownload(doc: Pdf, filename: string): void {
  const blob = doc.output("blob") as Blob;
  const pdfBlob =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

function drawGoldRule(doc: Pdf, y: number) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

/** Header band only — never draws Invoice/Seller/Buyer. */
function drawHeader(doc: Pdf, source: ProformaPdfSource) {
  const y = HEADER_TOP;
  const logo = 22;

  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y + 4, logo, logo, 2.5, 2.5, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(MARGIN + 2.5, y + 6.5, logo - 5, logo - 5, 1.5, 1.5, "F");
  setProformaFont(doc, "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(8);
  doc.text("FC", MARGIN + logo / 2, y + 4 + logo * 0.62, { align: "center" });

  setProformaFont(doc, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("FC AUTO EXPORT", MARGIN + logo + 6, y + 14);
  setProformaFont(doc, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text("USED VEHICLE EXPORT", MARGIN + logo + 6, y + 24);

  setProformaFont(doc, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("PROFORMA INVOICE", PAGE_W / 2, y + 16, { align: "center" });
  setProformaFont(doc, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("形式发票", PAGE_W / 2, y + 28, { align: "center" });

  const website = source.companySnapshot.companyWebsite || "fcautoexport.com";
  setProformaFont(doc, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text(website, PAGE_W - MARGIN, y + 12, { align: "right" });
  doc.setTextColor(...BLACK);
  doc.setFontSize(7.5);
  doc.text(source.salespersonPhone || "", PAGE_W - MARGIN, y + 22, {
    align: "right",
  });
  doc.text(source.salespersonEmail || "", PAGE_W - MARGIN, y + 32, {
    align: "right",
  });

  drawGoldRule(doc, HEADER_BOTTOM - 2);
}

function drawFooter(doc: Pdf, source: ProformaPdfSource) {
  const y = FOOTER_TOP;
  drawGoldRule(doc, y);
  setProformaFont(doc, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("FC AUTO EXPORT", PAGE_W / 2, y + 11, { align: "center" });
  setProformaFont(doc, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  const website = source.companySnapshot.companyWebsite || "fcautoexport.com";
  doc.text(
    `${website}  ·  ${source.salespersonPhone}  ·  ${source.salespersonEmail}`,
    PAGE_W / 2,
    y + 21,
    { align: "center" }
  );
  doc.setTextColor(...NAVY);
  doc.text("Page 1 / 1", PAGE_W - MARGIN, y + 21, { align: "right" });
}

function labelValue(
  doc: Pdf,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number
): number {
  setProformaFont(doc, "normal");
  doc.setFontSize(6);
  doc.setTextColor(...SLATE);
  doc.text(label, x, y);
  oneLine(doc, value || "—", x, y + 8, w, { fontSize: 7.5, bold: true });
  return 15;
}

function fieldRow(
  doc: Pdf,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  valueW: number
): number {
  setProformaFont(doc, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE);
  doc.text(`${label}:`, x, y);
  oneLine(doc, value || "—", x + labelW, y, valueW, { fontSize: 7.5 });
  return 10;
}

/** Info band starts at INFO_TOP — never overlaps header title. */
function drawInfo(doc: Pdf, source: ProformaPdfSource) {
  const colW = CONTENT_W / 3;
  const col1 = MARGIN;
  const col2 = MARGIN + colW;
  const col3 = MARGIN + colW * 2;
  const infoTop = INFO_TOP;
  const infoLimit = INFO_TOP + INFO_HEIGHT - 4;

  let y1 = infoTop;
  y1 += labelValue(doc, "Invoice No. / 发票号", source.invoiceNumber, col1, y1, colW - 8);
  if (y1 < infoLimit) {
    y1 += labelValue(
      doc,
      "Contract No. / 合同号",
      source.contractNumber || source.invoiceNumber,
      col1,
      y1,
      colW - 8
    );
  }
  if (y1 < infoLimit) {
    y1 += labelValue(doc, "Offer Date / 报价日期", source.offerDate, col1, y1, colW - 8);
  }
  if (y1 < infoLimit) {
    y1 += labelValue(
      doc,
      "Validity / 有效期",
      source.validityText || "7 Days",
      col1,
      y1,
      colW - 8
    );
  }
  if (y1 < infoLimit) {
    labelValue(doc, "Currency / 货币", "USD", col1, y1, colW - 8);
  }

  let y2 = infoTop;
  putText(doc, "Seller / 卖方", col2, y2, {
    fontSize: 8.5,
    bold: true,
    color: NAVY,
    maxWidth: colW - 8,
  });
  y2 += 11;
  y2 += fieldRow(doc, "Company", source.companySnapshot.companyName, col2, y2, 42, colW - 50);
  // Address: max 4 compact lines, does not grow INFO_HEIGHT
  setProformaFont(doc, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE);
  doc.text("Address:", col2, y2);
  const addrH = putText(doc, source.companySnapshot.companyAddress || "—", col2 + 42, y2, {
    fontSize: 7.5,
    maxWidth: colW - 50,
    lineGap: 1.2,
    maxLines: 4,
  });
  y2 += Math.max(10, Math.min(addrH, 4 * 8.7));
  if (y2 < infoLimit) y2 += fieldRow(doc, "Sales", source.salespersonName, col2, y2, 42, colW - 50);
  if (y2 < infoLimit) y2 += fieldRow(doc, "Phone", source.salespersonPhone, col2, y2, 42, colW - 50);
  if (y2 < infoLimit) y2 += fieldRow(doc, "Email", source.salespersonEmail, col2, y2, 42, colW - 50);
  if (y2 < infoLimit) {
    fieldRow(doc, "Website", source.companySnapshot.companyWebsite, col2, y2, 42, colW - 50);
  }

  let y3 = infoTop;
  putText(doc, "Buyer / 买方", col3, y3, {
    fontSize: 8.5,
    bold: true,
    color: NAVY,
    maxWidth: colW - 8,
  });
  y3 += 11;
  const dest = [source.destinationCountry, source.destinationPort]
    .filter(Boolean)
    .join(" / ");
  y3 += fieldRow(doc, "Customer", source.customerName, col3, y3, 52, colW - 60);
  if (source.customerCompany && y3 < infoLimit) {
    y3 += fieldRow(doc, "Company", source.customerCompany, col3, y3, 52, colW - 60);
  }
  if (source.customerCountry && y3 < infoLimit) {
    y3 += fieldRow(doc, "Country", source.customerCountry, col3, y3, 52, colW - 60);
  }
  if (source.customerWhatsapp && y3 < infoLimit) {
    y3 += fieldRow(doc, "WhatsApp", source.customerWhatsapp, col3, y3, 52, colW - 60);
  }
  if (source.customerEmail && y3 < infoLimit) {
    y3 += fieldRow(doc, "Email", source.customerEmail, col3, y3, 52, colW - 60);
  }
  if (dest && y3 < infoLimit) {
    fieldRow(doc, "Destination Port", dest, col3, y3, 52, colW - 60);
  }

  drawGoldRule(doc, INFO_TOP + INFO_HEIGHT - 2);
}

function drawVehicleTable(doc: Pdf, source: ProformaPdfSource) {
  putText(doc, "Vehicle Items / 车辆明细", MARGIN, VEHICLE_TITLE_TOP + 10, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });

  const headerY = VEHICLE_TABLE_TOP;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, headerY, CONTENT_W, VEHICLE_HEADER_HEIGHT, "F");
  setProformaFont(doc, "bold");
  doc.setTextColor(...WHITE);

  const cols: Array<{
    en: string;
    zh: string;
    x: number;
    align?: "left" | "center" | "right";
  }> = [
    { en: "No.", zh: "序号", x: MARGIN + 5 },
    { en: "Brand", zh: "品牌", x: MARGIN + 24 },
    { en: "Model", zh: "型号", x: MARGIN + 88 },
    { en: "Year", zh: "年份", x: MARGIN + 168 },
    { en: "Colour", zh: "颜色", x: MARGIN + 200 },
    { en: "VIN / Chassis No.", zh: "VIN / 车架号", x: MARGIN + 248 },
    { en: "Qty", zh: "数量", x: MARGIN + 390, align: "center" },
    { en: "Unit Price (USD)", zh: "单价", x: MARGIN + 455, align: "right" },
    { en: "Amount (USD)", zh: "金额", x: MARGIN + CONTENT_W - 3, align: "right" },
  ];

  for (const c of cols) {
    doc.setFontSize(6.5);
    if (c.align === "right") {
      doc.text(c.en, c.x, headerY + 9, { align: "right" });
      doc.setFontSize(5.5);
      doc.text(c.zh, c.x, headerY + 18, { align: "right" });
    } else if (c.align === "center") {
      doc.text(c.en, c.x, headerY + 9, { align: "center" });
      doc.setFontSize(5.5);
      doc.text(c.zh, c.x, headerY + 18, { align: "center" });
    } else {
      doc.text(c.en, c.x, headerY + 9);
      doc.setFontSize(5.5);
      doc.text(c.zh, c.x, headerY + 18);
    }
  }

  // Exactly 8 visible body rows with borders — empty rows still draw lines.
  for (let index = 0; index < VEHICLE_ROW_COUNT; index++) {
    const rowTop = vehicleRowTop(index);
    const item = source.items[index];

    if (index % 2 === 1) {
      doc.setFillColor(...LIGHT);
      doc.rect(MARGIN, rowTop, CONTENT_W, VEHICLE_ROW_HEIGHT, "F");
    }

    // Full row border (top already from previous line / header)
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.rect(MARGIN, rowTop, CONTENT_W, VEHICLE_ROW_HEIGHT, "S");

    const mid = rowTop + Math.floor(VEHICLE_ROW_HEIGHT * 0.65);
    if (item) {
      setProformaFont(doc, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(String(index + 1), MARGIN + 8, mid);
      oneLine(doc, item.brand || "—", MARGIN + 24, mid, 60, {
        fontSize: 7.5,
        bold: true,
      });
      oneLine(doc, item.model || "—", MARGIN + 88, mid, 74, { fontSize: 7.5 });
      oneLine(doc, item.year || "—", MARGIN + 168, mid, 28, { fontSize: 7.5 });
      oneLine(doc, item.colour || "—", MARGIN + 200, mid, 44, { fontSize: 7 });
      oneLine(doc, (item.vin || "—").slice(0, 22), MARGIN + 248, mid, 130, {
        fontSize: 6.5,
      });
      doc.setFontSize(7.5);
      doc.text(String(item.quantity), MARGIN + 390, mid, { align: "center" });
      doc.text(formatUsd(item.unitPriceUsd), MARGIN + 455, mid, {
        align: "right",
      });
      setProformaFont(doc, "bold");
      doc.text(formatUsd(item.totalUsd), MARGIN + CONTENT_W - 3, mid, {
        align: "right",
      });
    }
  }

  // Guard: shared bottom must match formula
  if (vehicleRowTop(7) + VEHICLE_ROW_HEIGHT !== VEHICLE_TABLE_BOTTOM) {
    throw new Error("VEHICLE_TABLE_BOTTOM mismatch");
  }
}

function drawChargesAndSummary(doc: Pdf, source: ProformaPdfSource) {
  // Absolute fixed Y — never table.finalY / lastAutoTable / cursor after vehicle rows.
  // There is no AutoTable in this file; vehicle rows are drawn manually above.
  const CHARGES_TOP_FIXED = 395;
  if (CHARGES_TOP !== CHARGES_TOP_FIXED) {
    throw new Error(
      `CHARGES_TOP drift: layout has ${CHARGES_TOP}, expected ${CHARGES_TOP_FIXED}`
    );
  }
  const y0 = CHARGES_TOP_FIXED;
  const half = (CONTENT_W - 10) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + half + 10;
  const bandBottom = y0 + CHARGES_HEIGHT;

  putText(doc, "Other Charges / 其他费用", leftX, y0 + 10, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  putText(doc, "Financial Summary / 金额汇总", rightX, y0 + 10, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });

  let cy = y0 + 22;
  const chargeRows =
    source.charges.length > 0
      ? source.charges.slice(0, 5)
      : [
          {
            nameEn: "—",
            nameZh: "",
            amountUsd: 0,
            note: null as string | null,
          },
        ];

  for (const c of chargeRows) {
    if (cy > bandBottom - 14) break;
    oneLine(
      doc,
      `${c.nameEn}${c.nameZh ? ` / ${c.nameZh}` : ""}`,
      leftX,
      cy,
      half - 72,
      { fontSize: 7.5 }
    );
    setProformaFont(doc, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(formatUsd(c.amountUsd), leftX + half - 2, cy, { align: "right" });
    cy += 11;
  }
  if (cy <= bandBottom - 12) {
    oneLine(doc, "Total Other Charges / 其他费用合计", leftX, cy, half - 72, {
      fontSize: 8,
      bold: true,
    });
    setProformaFont(doc, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(formatUsd(source.chargesTotalUsd), leftX + half - 2, cy, {
      align: "right",
    });
  }

  // Summary box top inside the charges band — NOT autoTable startY / finalY.
  const summaryBoxTop = y0 + 20;
  const boxH = Math.min(70, CHARGES_HEIGHT - 24);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(rightX, summaryBoxTop, half, boxH, 3, 3, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(rightX, summaryBoxTop, half, boxH, 3, 3, "S");

  const summary: Array<[string, string, boolean]> = [
    ["Vehicle Total / 车辆总价", formatUsd(source.vehicleSubtotalUsd), false],
    ["Other Charges / 其他费用", formatUsd(source.chargesTotalUsd), false],
    ["Grand Total / 总计", formatUsd(source.totalUsd), true],
    ["Deposit / 定金", formatUsd(source.depositUsd), false],
    ["Balance / 尾款", formatUsd(source.balanceUsd), true],
  ];
  let sy = summaryBoxTop + 10;
  for (const [label, value, strong] of summary) {
    if (sy > summaryBoxTop + boxH - 6) break;
    oneLine(doc, label, rightX + 6, sy, half - 88, {
      fontSize: strong ? 8 : 7.5,
      bold: strong,
      color: strong ? NAVY : SLATE,
    });
    setProformaFont(doc, strong ? "bold" : "normal");
    doc.setFontSize(strong ? 9 : 8);
    doc.setTextColor(...(strong ? NAVY : BLACK));
    doc.text(value, rightX + half - 6, sy, { align: "right" });
    sy += 11;
  }
}

function drawPayment(doc: Pdf, source: ProformaPdfSource) {
  // Fixed map — never derived from charges height / cursor / finalY.
  const PAYMENT_TOP_FIXED = 505;
  if (PAYMENT_TOP !== PAYMENT_TOP_FIXED) {
    throw new Error(
      `PAYMENT_TOP drift: layout has ${PAYMENT_TOP}, expected ${PAYMENT_TOP_FIXED}`
    );
  }
  const y0 = PAYMENT_TOP_FIXED;
  putText(doc, "Payment Information / 付款信息", MARGIN, y0 + 10, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });

  const boxTop = y0 + 18;
  const boxH = PAYMENT_HEIGHT - 22;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.roundedRect(MARGIN, boxTop, CONTENT_W, boxH, 3, 3, "S");

  const pay = source.paymentSnapshot;
  const colW = CONTENT_W / 2;
  const left: Array<[string, string]> = [
    ["Beneficiary / 收款人", compactPaymentValue(pay.fullName)],
    ["Bank / 开户银行", compactPaymentValue(pay.bankName)],
    ["Account Number / 银行账号", compactPaymentValue(pay.accountNumber)],
  ];
  const right: Array<[string, string]> = [
    ["Bank Address / 开户行地址", compactPaymentValue(pay.bankAddress)],
    ["SWIFT / SWIFT代码", compactPaymentValue(pay.swift)],
  ];

  let ly = boxTop + 10;
  for (const [label, value] of left) {
    setProformaFont(doc, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    const labelText = `${label}: `;
    doc.text(labelText, MARGIN + 6, ly);
    const lw = Math.min(doc.getTextWidth(labelText), colW * 0.55);
    oneLine(doc, value, MARGIN + 6 + lw, ly, colW - 14 - lw, {
      fontSize: 7.5,
      bold: true,
    });
    ly += 10;
  }

  let ry = boxTop + 10;
  for (const [label, value] of right) {
    setProformaFont(doc, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    const labelText = `${label}: `;
    doc.text(labelText, MARGIN + colW + 4, ry);
    const lw = Math.min(doc.getTextWidth(labelText), colW * 0.5);
    oneLine(doc, value, MARGIN + colW + 4 + lw, ry, colW - 14 - lw, {
      fontSize: 7.5,
      bold: true,
    });
    ry += 10;
  }
}

function drawTerms(doc: Pdf, source: ProformaPdfSource) {
  // Fixed map — never derived from payment height / cursor / finalY.
  const TERMS_TOP_FIXED = 575;
  if (TERMS_TOP !== TERMS_TOP_FIXED) {
    throw new Error(
      `TERMS_TOP drift: layout has ${TERMS_TOP}, expected ${TERMS_TOP_FIXED}`
    );
  }
  let y = TERMS_TOP_FIXED + 10;
  putText(doc, "Terms / 条款", MARGIN, y, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 12;

  const enabled = source.termsSnapshot.filter((t) => t.enabled);
  for (let i = 0; i < enabled.length; i++) {
    const term = enabled[i]!;
    if (y >= TERMS_MAX_BOTTOM) break;
    if (term.textEn) {
      const h = putText(doc, `${i + 1}. ${term.textEn}`, MARGIN, y, {
        fontSize: 7.5,
        maxWidth: CONTENT_W,
        lineGap: 1.3,
      });
      y += h + 0.5;
    }
    if (term.textZh && y < TERMS_MAX_BOTTOM) {
      const h = putText(
        doc,
        term.textEn ? term.textZh : `${i + 1}. ${term.textZh}`,
        MARGIN + (term.textEn ? 8 : 0),
        y,
        {
          fontSize: 7.5,
          color: SLATE,
          maxWidth: CONTENT_W - (term.textEn ? 8 : 0),
          lineGap: 1.3,
        }
      );
      y += h + 2.5;
    }
  }

  if (source.notes && y < TERMS_MAX_BOTTOM) {
    putText(doc, source.notes, MARGIN, y, {
      fontSize: 7.5,
      color: SLATE,
      maxWidth: CONTENT_W,
      lineGap: 1.3,
    });
  }
}

export function detailToPdfSource(detail: ProformaDetail): ProformaPdfSource {
  return {
    invoiceNumber: detail.invoiceNumber,
    contractNumber: detail.contractNumber,
    offerDate: detail.offerDate,
    validityText: detail.validityText,
    customerName: detail.customerName,
    customerCompany: detail.customerCompany,
    customerCountry: detail.customerCountry,
    customerAddress: detail.customerAddress,
    customerWhatsapp: detail.customerWhatsapp,
    customerEmail: detail.customerEmail,
    destinationCountry: detail.destinationCountry,
    destinationPort: detail.destinationPort,
    salespersonName: detail.salespersonName,
    salespersonPhone: detail.salespersonPhone,
    salespersonEmail: detail.salespersonEmail,
    companySnapshot: detail.companySnapshot,
    paymentSnapshot: detail.paymentSnapshot,
    vehicleSubtotalUsd: detail.vehicleSubtotalUsd,
    chargesTotalUsd: detail.chargesTotalUsd,
    totalUsd: detail.totalUsd,
    depositUsd: detail.depositUsd,
    balanceUsd: detail.balanceUsd,
    termsSnapshot: detail.termsSnapshot,
    notes: detail.notes,
    items: detail.items,
    charges: detail.charges,
  };
}

/**
 * Build and download a real single-page A4 PDF from the shared coordinate map.
 */
export async function downloadProformaPdf(
  source: ProformaPdfSource
): Promise<{ filename: string }> {
  if (!source.invoiceNumber?.trim()) {
    throw new Error("缺少发票编号，无法生成 PDF");
  }

  const fit = checkProformaOnePageFit({
    vehicleCount: source.items.length,
    enabledTerms: source.termsSnapshot
      .filter((t) => t.enabled)
      .map((t) => ({ textEn: t.textEn, textZh: t.textZh })),
    notes: source.notes,
  });
  if (!fit.ok) {
    throw new Error(fit.errorZh || fit.errorEn || "无法生成单页 PDF");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await ensureProformaFonts(doc);

  drawHeader(doc, source);
  drawInfo(doc, source);
  drawVehicleTable(doc, source);
  drawChargesAndSummary(doc, source);
  drawPayment(doc, source);
  drawTerms(doc, source);
  drawFooter(doc, source);

  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  const filename = buildProformaPdfFilename(source.invoiceNumber);
  triggerPdfFileDownload(doc, filename);
  return { filename };
}
