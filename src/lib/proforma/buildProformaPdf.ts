/**
 * Fixed one-page A4 Proforma Invoice PDF.
 * Exactly 8 vehicle slots — no multi-page vehicle pagination.
 * Regenerates layout from saved snapshots — does not recalculate live prices.
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
  PI_CHARGES_TOP,
  PI_CONTENT_W,
  PI_FOOTER_TOP,
  PI_HEADER_TOP,
  PI_MARGIN,
  PI_META_TOP,
  PI_PAGE_H,
  PI_PAGE_W,
  PI_PAYMENT_TOP,
  PI_TERMS_BOTTOM_LIMIT,
  PI_TERMS_TOP,
  PI_VEHICLE_HEADER_H,
  PI_VEHICLE_ROW_COUNT,
  PI_VEHICLE_ROW_H,
  PI_VEHICLE_TABLE_TOP,
  PI_VEHICLE_TITLE_TOP,
  checkProformaOnePageFit,
  compactPaymentValue,
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
const PAGE_W = PI_PAGE_W;
const PAGE_H = PI_PAGE_H;
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
  }
): number {
  const fontSize = opts?.fontSize ?? 8.5;
  const color = opts?.color ?? BLACK;
  const maxWidth = opts?.maxWidth ?? CONTENT_W;
  const align = opts?.align ?? "left";
  const lineGap = opts?.lineGap ?? 2.2;
  if (!text) return fontSize * 0.2;

  setProformaFont(doc, opts?.bold ? "bold" : "normal");
  doc.setTextColor(...color);
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y, { align });
  return lines.length * (fontSize + lineGap);
}

/** One-line text with ellipsis — never grows row height. */
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

function drawDocHeader(doc: Pdf, source: ProformaPdfSource) {
  const y = PI_HEADER_TOP;
  const logo = 20;

  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, logo, logo, 2.5, 2.5, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(MARGIN + 2.5, y + 2.5, logo - 5, logo - 5, 1.5, 1.5, "F");
  setProformaFont(doc, "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(8);
  doc.text("FC", MARGIN + logo / 2, y + logo * 0.62, { align: "center" });

  setProformaFont(doc, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("FC AUTO EXPORT", MARGIN + logo + 6, y + 9);
  setProformaFont(doc, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text("USED VEHICLE EXPORT", MARGIN + logo + 6, y + 18);

  setProformaFont(doc, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("PROFORMA INVOICE", PAGE_W / 2, y + 10, { align: "center" });
  setProformaFont(doc, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("形式发票", PAGE_W / 2, y + 20, { align: "center" });

  const website = source.companySnapshot.companyWebsite || "fcautoexport.com";
  setProformaFont(doc, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text(website, PAGE_W - MARGIN, y + 7, { align: "right" });
  doc.setTextColor(...BLACK);
  doc.setFontSize(7.5);
  doc.text(source.salespersonPhone || "", PAGE_W - MARGIN, y + 16, {
    align: "right",
  });
  doc.text(source.salespersonEmail || "", PAGE_W - MARGIN, y + 25, {
    align: "right",
  });

  drawGoldRule(doc, y + logo + 4);
}

function drawFooter(doc: Pdf, source: ProformaPdfSource) {
  const y = PI_FOOTER_TOP;
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
  return 9;
}

function drawMeta(doc: Pdf, source: ProformaPdfSource) {
  const colW = CONTENT_W / 3;
  const col1 = MARGIN;
  const col2 = MARGIN + colW;
  const col3 = MARGIN + colW * 2;
  const infoTop = PI_META_TOP;

  let y1 = infoTop;
  y1 += labelValue(doc, "Invoice No. / 发票号", source.invoiceNumber, col1, y1, colW - 8);
  y1 += labelValue(
    doc,
    "Contract No. / 合同号",
    source.contractNumber || source.invoiceNumber,
    col1,
    y1,
    colW - 8
  );
  y1 += labelValue(doc, "Offer Date / 报价日期", source.offerDate, col1, y1, colW - 8);
  y1 += labelValue(
    doc,
    "Validity / 有效期",
    source.validityText || "7 Days",
    col1,
    y1,
    colW - 8
  );
  y1 += labelValue(doc, "Currency / 货币", "USD", col1, y1, colW - 8);

  let y2 = infoTop;
  putText(doc, "Seller / 卖方", col2, y2, {
    fontSize: 8.5,
    bold: true,
    color: NAVY,
    maxWidth: colW - 8,
  });
  y2 += 9;
  y2 += fieldRow(doc, "Company", source.companySnapshot.companyName, col2, y2, 42, colW - 50);
  y2 += fieldRow(doc, "Address", source.companySnapshot.companyAddress, col2, y2, 42, colW - 50);
  y2 += fieldRow(doc, "Sales", source.salespersonName, col2, y2, 42, colW - 50);
  y2 += fieldRow(doc, "Phone", source.salespersonPhone, col2, y2, 42, colW - 50);
  y2 += fieldRow(doc, "Email", source.salespersonEmail, col2, y2, 42, colW - 50);
  y2 += fieldRow(doc, "Website", source.companySnapshot.companyWebsite, col2, y2, 42, colW - 50);

  let y3 = infoTop;
  putText(doc, "Buyer / 买方", col3, y3, {
    fontSize: 8.5,
    bold: true,
    color: NAVY,
    maxWidth: colW - 8,
  });
  y3 += 9;
  const dest = [source.destinationCountry, source.destinationPort]
    .filter(Boolean)
    .join(" / ");
  y3 += fieldRow(doc, "Customer", source.customerName, col3, y3, 52, colW - 60);
  if (source.customerCompany) {
    y3 += fieldRow(doc, "Company", source.customerCompany, col3, y3, 52, colW - 60);
  }
  if (source.customerCountry) {
    y3 += fieldRow(doc, "Country", source.customerCountry, col3, y3, 52, colW - 60);
  }
  if (source.customerWhatsapp) {
    y3 += fieldRow(doc, "WhatsApp", source.customerWhatsapp, col3, y3, 52, colW - 60);
  }
  if (source.customerEmail) {
    y3 += fieldRow(doc, "Email", source.customerEmail, col3, y3, 52, colW - 60);
  }
  if (dest) {
    y3 += fieldRow(doc, "Destination Port", dest, col3, y3, 52, colW - 60);
  }

  const ruleY = Math.min(
    PI_VEHICLE_TITLE_TOP - 6,
    Math.max(y1, y2, y3) + 4
  );
  drawGoldRule(doc, ruleY);
}

function drawVehicleTable(doc: Pdf, source: ProformaPdfSource) {
  putText(doc, "Vehicle Items / 车辆明细", MARGIN, PI_VEHICLE_TITLE_TOP, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });

  let y = PI_VEHICLE_TABLE_TOP;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, PI_VEHICLE_HEADER_H, "F");
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
      doc.text(c.en, c.x, y + 7, { align: "right" });
      doc.setFontSize(5.5);
      doc.text(c.zh, c.x, y + 15, { align: "right" });
    } else if (c.align === "center") {
      doc.text(c.en, c.x, y + 7, { align: "center" });
      doc.setFontSize(5.5);
      doc.text(c.zh, c.x, y + 15, { align: "center" });
    } else {
      doc.text(c.en, c.x, y + 7);
      doc.setFontSize(5.5);
      doc.text(c.zh, c.x, y + 15);
    }
  }

  y += PI_VEHICLE_HEADER_H;

  for (let i = 0; i < PI_VEHICLE_ROW_COUNT; i++) {
    const item = source.items[i];
    const blank = !item;
    if (i % 2 === 1) {
      doc.setFillColor(...LIGHT);
      doc.rect(MARGIN, y, CONTENT_W, PI_VEHICLE_ROW_H, "F");
    }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.35);
    doc.line(MARGIN, y + PI_VEHICLE_ROW_H, PAGE_W - MARGIN, y + PI_VEHICLE_ROW_H);

    const mid = y + 10;
    if (!blank) {
      setProformaFont(doc, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(String(i + 1), MARGIN + 8, mid);
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

    y += PI_VEHICLE_ROW_H;
  }
}

function drawChargesAndSummary(doc: Pdf, source: ProformaPdfSource) {
  const y0 = PI_CHARGES_TOP;
  const half = (CONTENT_W - 10) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + half + 10;

  putText(doc, "Other Charges / 其他费用", leftX, y0, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  putText(doc, "Financial Summary / 金额汇总", rightX, y0, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });

  let cy = y0 + 10;
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
    cy += 10;
  }
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

  const startY = y0 + 10;
  const boxH = 64;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(rightX, startY - 1, half, boxH, 3, 3, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(rightX, startY - 1, half, boxH, 3, 3, "S");

  const summary: Array<[string, string, boolean]> = [
    ["Vehicle Total / 车辆总价", formatUsd(source.vehicleSubtotalUsd), false],
    ["Other Charges / 其他费用", formatUsd(source.chargesTotalUsd), false],
    ["Grand Total / 总计", formatUsd(source.totalUsd), true],
    ["Deposit / 定金", formatUsd(source.depositUsd), false],
    ["Balance / 尾款", formatUsd(source.balanceUsd), true],
  ];
  let sy = startY + 8;
  for (const [label, value, strong] of summary) {
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
  const y0 = PI_PAYMENT_TOP;
  putText(doc, "Payment Information / 付款信息", MARGIN, y0, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });

  const boxTop = y0 + 9;
  const boxH = 44;
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
    ly += 11;
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
    ry += 11;
  }
}

function drawTerms(doc: Pdf, source: ProformaPdfSource) {
  let y = PI_TERMS_TOP;
  putText(doc, "Terms / 条款", MARGIN, y, {
    fontSize: 9.5,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 10;

  const enabled = source.termsSnapshot.filter((t) => t.enabled);
  for (let i = 0; i < enabled.length; i++) {
    const term = enabled[i]!;
    if (y >= PI_TERMS_BOTTOM_LIMIT) break;
    if (term.textEn) {
      const h = putText(doc, `${i + 1}. ${term.textEn}`, MARGIN, y, {
        fontSize: 7.5,
        maxWidth: CONTENT_W,
        lineGap: 1.3,
      });
      y += h + 0.5;
    }
    if (term.textZh && y < PI_TERMS_BOTTOM_LIMIT) {
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

  if (source.notes && y < PI_TERMS_BOTTOM_LIMIT) {
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
 * Build and download a real single-page A4 PDF.
 * Filename: `{invoiceNumber}.pdf`
 * Throws if vehicle count > 8 or terms overflow the fixed band.
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

  drawDocHeader(doc, source);
  drawMeta(doc, source);
  drawVehicleTable(doc, source);
  drawChargesAndSummary(doc, source);
  drawPayment(doc, source);
  drawTerms(doc, source);
  drawFooter(doc, source);

  // Guard: never create a second page.
  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  const filename = buildProformaPdfFilename(source.invoiceNumber);
  triggerPdfFileDownload(doc, filename);
  return { filename };
}
