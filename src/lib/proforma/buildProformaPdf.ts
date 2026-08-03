/**
 * Approved A4 Proforma Invoice PDF layout.
 * Vector bilingual text via embedded Noto Sans SC.
 * Page 1 targets ≤8 vehicle rows; continuation pages for overflow.
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
  PI_CONTENT_W,
  PI_GAP,
  PI_MARGIN,
  PI_PAGE_H,
  PI_PAGE_W,
  PI_TABLE_HEADER_H,
  estimateVehicleRowHeight,
  paginateProformaVehicles,
  type ProformaLayoutInput,
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

function toLayoutInput(source: ProformaPdfSource): ProformaLayoutInput {
  return {
    items: source.items.map((item) => ({
      brand: item.brand,
      model: item.model,
      year: item.year,
      colour: item.colour,
      vin: item.vin,
    })),
    chargesCount: source.charges.length,
    enabledTerms: source.termsSnapshot
      .filter((t) => t.enabled)
      .map((t) => ({ textEn: t.textEn, textZh: t.textZh })),
    notes: source.notes,
    companyAddress: source.companySnapshot.companyAddress || "",
    customerCompany: source.customerCompany,
    customerCountry: source.customerCountry,
    customerWhatsapp: source.customerWhatsapp,
    customerEmail: source.customerEmail,
    destinationCountry: source.destinationCountry,
    destinationPort: source.destinationPort,
  };
}

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

/** Shared header: left brand, center title, right contacts. */
function drawDocHeader(
  doc: Pdf,
  source: ProformaPdfSource,
  opts?: { compact?: boolean }
): number {
  const compact = Boolean(opts?.compact);
  let y = MARGIN;
  const logo = compact ? 18 : 22;

  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, logo, logo, 2.5, 2.5, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(MARGIN + 2.5, y + 2.5, logo - 5, logo - 5, 1.5, 1.5, "F");
  setProformaFont(doc, "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(compact ? 7 : 8);
  doc.text("FC", MARGIN + logo / 2, y + logo * 0.62, { align: "center" });

  setProformaFont(doc, "bold");
  doc.setFontSize(compact ? 9 : 11);
  doc.setTextColor(...NAVY);
  doc.text("FC AUTO EXPORT", MARGIN + logo + 6, y + (compact ? 8 : 9));
  setProformaFont(doc, "normal");
  doc.setFontSize(compact ? 6.5 : 7.5);
  doc.setTextColor(...SLATE);
  doc.text("USED VEHICLE EXPORT", MARGIN + logo + 6, y + (compact ? 16 : 18));

  setProformaFont(doc, "bold");
  doc.setFontSize(compact ? 11 : 14);
  doc.setTextColor(...NAVY);
  doc.text("PROFORMA INVOICE", PAGE_W / 2, y + (compact ? 8 : 10), {
    align: "center",
  });
  setProformaFont(doc, "normal");
  doc.setFontSize(compact ? 7.5 : 9);
  doc.setTextColor(...GOLD);
  doc.text("形式发票", PAGE_W / 2, y + (compact ? 17 : 20), {
    align: "center",
  });

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

  y += logo + (compact ? 6 : 8);
  drawGoldRule(doc, y);
  return y + 8;
}

function drawFooter(
  doc: Pdf,
  source: ProformaPdfSource,
  page: number,
  total: number
) {
  const y = PAGE_H - 34;
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
  doc.text(`Page ${page} / ${total}`, PAGE_W - MARGIN, y + 21, {
    align: "right",
  });
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
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE);
  doc.text(label, x, y);
  return (
    8 +
    putText(doc, value || "—", x, y + 9, {
      fontSize: 8,
      bold: true,
      maxWidth: w,
      lineGap: 1.8,
    })
  );
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
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text(`${label}:`, x, y);
  const h = putText(doc, value || "—", x + labelW, y, {
    fontSize: 7.5,
    maxWidth: valueW,
    lineGap: 1.6,
  });
  return Math.max(10, h);
}

function drawVehicleTableHeader(doc: Pdf, y: number): number {
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, PI_TABLE_HEADER_H, "F");
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
      doc.text(c.en, c.x, y + 8, { align: "right" });
      doc.setFontSize(6);
      doc.text(c.zh, c.x, y + 16, { align: "right" });
    } else if (c.align === "center") {
      doc.text(c.en, c.x, y + 8, { align: "center" });
      doc.setFontSize(6);
      doc.text(c.zh, c.x, y + 16, { align: "center" });
    } else {
      doc.text(c.en, c.x, y + 8);
      doc.setFontSize(6);
      doc.text(c.zh, c.x, y + 16);
    }
  }
  return y + PI_TABLE_HEADER_H;
}

function drawVehicleRow(
  doc: Pdf,
  item: ProformaPdfSource["items"][number],
  displayNo: number,
  y: number,
  zebra: boolean,
  rowHeight?: number
): number {
  const rowH = rowHeight ?? estimateVehicleRowHeight(item);
  if (zebra) {
    doc.setFillColor(...LIGHT);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);

  const textY = y + 11;
  setProformaFont(doc, "normal");
  doc.setTextColor(...BLACK);
  doc.setFontSize(7.5);
  doc.text(String(displayNo), MARGIN + 8, textY);

  putText(doc, item.brand || "—", MARGIN + 24, textY, {
    fontSize: 7.5,
    bold: true,
    maxWidth: 60,
    lineGap: 1.2,
  });
  putText(doc, item.model || "—", MARGIN + 88, textY, {
    fontSize: 7.5,
    maxWidth: 74,
    lineGap: 1.2,
  });

  setProformaFont(doc, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  doc.text(item.year || "—", MARGIN + 168, textY);
  putText(doc, item.colour || "—", MARGIN + 200, textY, {
    fontSize: 7,
    maxWidth: 44,
    lineGap: 1.2,
  });
  setProformaFont(doc, "normal");
  doc.setFontSize(6.5);
  doc.text((item.vin || "—").slice(0, 18), MARGIN + 248, textY);

  doc.setFontSize(7.5);
  doc.text(String(item.quantity), MARGIN + 390, textY, { align: "center" });
  doc.text(formatUsd(item.unitPriceUsd), MARGIN + 455, textY, {
    align: "right",
  });
  setProformaFont(doc, "bold");
  doc.text(formatUsd(item.totalUsd), MARGIN + CONTENT_W - 3, textY, {
    align: "right",
  });

  return y + rowH;
}

function drawChargesAndSummary(
  doc: Pdf,
  source: ProformaPdfSource,
  y: number
): number {
  const half = (CONTENT_W - 10) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + half + 10;

  putText(doc, "Other Charges / 其他费用", leftX, y, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  putText(doc, "Financial Summary / 金额汇总", rightX, y, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  y += 12;

  const startY = y;
  let cy = y;
  const rows =
    source.charges.length > 0
      ? source.charges
      : [
          {
            nameEn: "—",
            nameZh: "",
            amountUsd: 0,
            note: null as string | null,
          },
        ];

  for (const c of rows) {
    putText(
      doc,
      `${c.nameEn}${c.nameZh ? ` / ${c.nameZh}` : ""}`,
      leftX,
      cy,
      { fontSize: 7.5, maxWidth: half - 72, lineGap: 1.5 }
    );
    setProformaFont(doc, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(formatUsd(c.amountUsd), leftX + half - 2, cy, { align: "right" });
    cy += 11;
  }
  putText(doc, "Total Other Charges / 其他费用合计", leftX, cy, {
    fontSize: 8,
    bold: true,
    maxWidth: half - 72,
  });
  setProformaFont(doc, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(formatUsd(source.chargesTotalUsd), leftX + half - 2, cy, {
    align: "right",
  });
  cy += 12;

  const boxH = 72;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(rightX, startY - 2, half, boxH, 3, 3, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(rightX, startY - 2, half, boxH, 3, 3, "S");

  const summary: Array<[string, string, boolean]> = [
    ["Vehicle Total / 车辆总价", formatUsd(source.vehicleSubtotalUsd), false],
    ["Other Charges / 其他费用", formatUsd(source.chargesTotalUsd), false],
    ["Grand Total / 总计", formatUsd(source.totalUsd), true],
    ["Deposit / 定金", formatUsd(source.depositUsd), false],
    ["Balance / 尾款", formatUsd(source.balanceUsd), true],
  ];
  let sy = startY + 8;
  for (const [label, value, strong] of summary) {
    putText(doc, label, rightX + 6, sy, {
      fontSize: strong ? 8.5 : 7.5,
      bold: strong,
      color: strong ? NAVY : SLATE,
      maxWidth: half - 88,
      lineGap: 1.5,
    });
    setProformaFont(doc, strong ? "bold" : "normal");
    doc.setFontSize(strong ? 9.5 : 8);
    doc.setTextColor(...(strong ? NAVY : BLACK));
    doc.text(value, rightX + half - 6, sy, { align: "right" });
    sy += 12;
  }

  return Math.max(cy, startY + boxH) + 8;
}

function drawPayment(doc: Pdf, source: ProformaPdfSource, y: number): number {
  putText(doc, "Payment Information / 付款信息", MARGIN, y, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 10;

  const pay = source.paymentSnapshot;
  const boxH = 40;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "S");

  const colW = CONTENT_W / 2;
  const left: Array<[string, string]> = [
    ["Beneficiary / 收款人", pay.fullName || "—"],
    ["Bank / 开户银行", pay.bankName || "—"],
    ["Account Number / 银行账号", pay.accountNumber || "—"],
  ];
  const right: Array<[string, string]> = [
    ["Bank Address / 开户行地址", pay.bankAddress || "—"],
    ["SWIFT / SWIFT代码", pay.swift || "—"],
  ];

  let ly = y + 10;
  for (const [label, value] of left) {
    setProformaFont(doc, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    doc.text(label, MARGIN + 6, ly);
    putText(doc, value, MARGIN + 6, ly + 8, {
      fontSize: 7.5,
      bold: true,
      maxWidth: colW - 14,
      lineGap: 1.4,
    });
    ly += 12;
  }
  let ry = y + 10;
  for (const [label, value] of right) {
    setProformaFont(doc, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    doc.text(label, MARGIN + colW + 4, ry);
    putText(doc, value, MARGIN + colW + 4, ry + 8, {
      fontSize: 7.5,
      bold: true,
      maxWidth: colW - 14,
      lineGap: 1.4,
    });
    ry += 12;
  }

  return y + boxH + 8;
}

function drawTerms(doc: Pdf, source: ProformaPdfSource, y: number): number {
  putText(doc, "Terms / 条款", MARGIN, y, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 11;

  const enabled = source.termsSnapshot.filter((t) => t.enabled);
  enabled.forEach((term, i) => {
    if (term.textEn) {
      const h = putText(doc, `${i + 1}. ${term.textEn}`, MARGIN, y, {
        fontSize: 7.5,
        maxWidth: CONTENT_W,
        lineGap: 1.8,
      });
      y += h + 1;
    }
    if (term.textZh) {
      const h = putText(
        doc,
        term.textEn ? term.textZh : `${i + 1}. ${term.textZh}`,
        MARGIN + (term.textEn ? 8 : 0),
        y,
        {
          fontSize: 7.5,
          color: SLATE,
          maxWidth: CONTENT_W - (term.textEn ? 8 : 0),
          lineGap: 1.8,
        }
      );
      y += h + 4;
    } else {
      y += 3;
    }
  });

  if (source.notes) {
    y += putText(doc, source.notes, MARGIN, y, {
      fontSize: 7.5,
      color: SLATE,
      maxWidth: CONTENT_W,
      lineGap: 1.8,
    });
  }
  return y;
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
 * Build and download a real A4 PDF matching the approved layout.
 * Filename: `{invoiceNumber}.pdf`
 */
export async function downloadProformaPdf(
  source: ProformaPdfSource
): Promise<{ filename: string }> {
  if (!source.invoiceNumber?.trim()) {
    throw new Error("缺少发票编号，无法生成 PDF");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await ensureProformaFonts(doc);

  // —— Shared iterative pagination (same helper as preview) ——
  const pagination = paginateProformaVehicles(toLayoutInput(source));
  const pages = pagination.pages;
  const totalPages = pagination.totalPages;
  const rowHeights = pagination.rowHeights;

  // ========== PAGE 1 ==========
  let y = drawDocHeader(doc, source);

  // Three-column top info
  const colW = CONTENT_W / 3;
  const col1 = MARGIN;
  const col2 = MARGIN + colW;
  const col3 = MARGIN + colW * 2;
  const infoTop = y;

  // Left identifiers
  let y1 = infoTop;
  y1 += labelValue(
    doc,
    "Invoice No. / 发票号",
    source.invoiceNumber,
    col1,
    y1,
    colW - 8
  );
  y1 += labelValue(
    doc,
    "Contract No. / 合同号",
    source.contractNumber || source.invoiceNumber,
    col1,
    y1,
    colW - 8
  );
  y1 += labelValue(
    doc,
    "Offer Date / 报价日期",
    source.offerDate,
    col1,
    y1,
    colW - 8
  );
  y1 += labelValue(
    doc,
    "Validity / 有效期",
    source.validityText || "7 Days",
    col1,
    y1,
    colW - 8
  );
  y1 += labelValue(doc, "Currency / 货币", "USD", col1, y1, colW - 8);

  // Middle seller
  let y2 = infoTop;
  putText(doc, "Seller / 卖方", col2, y2, {
    fontSize: 9,
    bold: true,
    color: NAVY,
    maxWidth: colW - 8,
  });
  y2 += 11;
  y2 += fieldRow(
    doc,
    "Company",
    source.companySnapshot.companyName,
    col2,
    y2,
    42,
    colW - 50
  );
  y2 += fieldRow(
    doc,
    "Address",
    source.companySnapshot.companyAddress,
    col2,
    y2,
    42,
    colW - 50
  );
  y2 += fieldRow(doc, "Sales", source.salespersonName, col2, y2, 42, colW - 50);
  y2 += fieldRow(doc, "Phone", source.salespersonPhone, col2, y2, 42, colW - 50);
  y2 += fieldRow(doc, "Email", source.salespersonEmail, col2, y2, 42, colW - 50);
  y2 += fieldRow(
    doc,
    "Website",
    source.companySnapshot.companyWebsite,
    col2,
    y2,
    42,
    colW - 50
  );

  // Right buyer
  let y3 = infoTop;
  putText(doc, "Buyer / 买方", col3, y3, {
    fontSize: 9,
    bold: true,
    color: NAVY,
    maxWidth: colW - 8,
  });
  y3 += 11;
  const dest = [source.destinationCountry, source.destinationPort]
    .filter(Boolean)
    .join(" / ");
  y3 += fieldRow(doc, "Customer", source.customerName, col3, y3, 52, colW - 60);
  if (source.customerCompany) {
    y3 += fieldRow(
      doc,
      "Company",
      source.customerCompany,
      col3,
      y3,
      52,
      colW - 60
    );
  }
  if (source.customerCountry) {
    y3 += fieldRow(
      doc,
      "Country",
      source.customerCountry,
      col3,
      y3,
      52,
      colW - 60
    );
  }
  if (source.customerWhatsapp) {
    y3 += fieldRow(
      doc,
      "WhatsApp",
      source.customerWhatsapp,
      col3,
      y3,
      52,
      colW - 60
    );
  }
  if (source.customerEmail) {
    y3 += fieldRow(doc, "Email", source.customerEmail, col3, y3, 52, colW - 60);
  }
  if (dest) {
    y3 += fieldRow(doc, "Destination Port", dest, col3, y3, 52, colW - 60);
  }

  y = Math.max(y1, y2, y3) + 8;
  drawGoldRule(doc, y);
  y += 8;

  // Vehicle table (page 1)
  putText(doc, "Vehicle Items / 车辆明细", MARGIN, y, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 11;
  y = drawVehicleTableHeader(doc, y);

  const page1Indices = pages[0] ?? [];
  page1Indices.forEach((itemIndex, i) => {
    const item = source.items[itemIndex]!;
    y = drawVehicleRow(
      doc,
      item,
      itemIndex + 1,
      y,
      i % 2 === 1,
      rowHeights[itemIndex]
    );
  });

  const hasMore = source.items.length > page1Indices.length;
  if (hasMore) {
    y += 4;
    putText(
      doc,
      "For more vehicles, please see next page.  /  如有更多车辆，请见下一页。",
      MARGIN,
      y,
      { fontSize: 7.5, color: SLATE, maxWidth: CONTENT_W, lineGap: 1.6 }
    );
    y += PI_GAP.moreNotice;
  }
  y += PI_GAP.tableToCharges;

  // Charges, payment, terms — only on page 1
  y = drawChargesAndSummary(doc, source, y);
  y = drawPayment(doc, source, y);
  drawTerms(doc, source, y);
  drawFooter(doc, source, 1, totalPages);

  // ========== CONTINUATION PAGES ==========
  for (let p = 1; p < pages.length; p++) {
    doc.addPage();
    let cy = drawDocHeader(doc, source, { compact: true });
    putText(doc, "Vehicle Items (Continued) / 车辆明细（续）", MARGIN, cy, {
      fontSize: 10,
      bold: true,
      color: NAVY,
      maxWidth: CONTENT_W,
    });
    cy += 11;
    cy = drawVehicleTableHeader(doc, cy);

    const indices = pages[p]!;
    indices.forEach((itemIndex, i) => {
      const item = source.items[itemIndex]!;
      cy = drawVehicleRow(
        doc,
        item,
        itemIndex + 1,
        cy,
        i % 2 === 1,
        rowHeights[itemIndex]
      );
    });

    if (p === pages.length - 1) {
      cy += 8;
      setProformaFont(doc, "bold");
      doc.setFontSize(8);
      doc.setTextColor(...SLATE);
      doc.text("*** End of List / 以下无更多车辆 ***", PAGE_W / 2, cy, {
        align: "center",
      });
    }

    drawFooter(doc, source, p + 1, totalPages);
  }

  // Ensure footers if only one page already drawn
  if (totalPages === 1) {
    // footer already drawn
  }

  const filename = buildProformaPdfFilename(source.invoiceNumber);
  triggerPdfFileDownload(doc, filename);
  return { filename };
}
