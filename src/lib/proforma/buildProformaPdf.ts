/**
 * Compact professional A4 Proforma Invoice PDF V3 (jsPDF).
 * True vector bilingual text via embedded Noto Sans SC — no text rasterization.
 * Uses exact saved invoice snapshots — does not recalculate live prices.
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
  ensureProformaFonts,
  setProformaFont,
} from "@/lib/proforma/pdfFonts";

const NAVY: [number, number, number] = [30, 41, 59];
const GOLD: [number, number, number] = [212, 175, 55];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [248, 250, 252];
const LINE: [number, number, number] = [226, 232, 240];
const BLACK: [number, number, number] = [15, 23, 42];

const MARGIN = 30;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 36;
const BODY = 9.5;

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
  const fontSize = opts?.fontSize ?? BODY;
  const color = opts?.color ?? BLACK;
  const maxWidth = opts?.maxWidth ?? CONTENT_W;
  const align = opts?.align ?? "left";
  const lineGap = opts?.lineGap ?? 3;
  if (!text) return fontSize * 0.25;

  setProformaFont(doc, opts?.bold ? "bold" : "normal");
  doc.setTextColor(...color);
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y, { align });
  return lines.length * (fontSize + lineGap);
}

function ensureSpace(
  doc: Pdf,
  y: number,
  need: number
): { y: number; pageBreak: boolean } {
  if (y + need <= FOOTER_Y - 8) return { y, pageBreak: false };
  doc.addPage();
  drawChrome(doc);
  return { y: MARGIN + 12, pageBreak: true };
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
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

function drawChrome(doc: Pdf) {
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, PAGE_W, 3, "F");
}

function drawFooter(doc: Pdf, page: number, total: number) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, FOOTER_Y - 10, PAGE_W - MARGIN, FOOTER_Y - 10);
  setProformaFont(doc, "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(8);
  doc.text("FC AUTO EXPORT", MARGIN, FOOTER_Y);
  setProformaFont(doc, "normal");
  doc.setTextColor(...SLATE);
  doc.setFontSize(7.5);
  doc.text("www.fcautoexport.com", MARGIN, FOOTER_Y + 11);
  doc.text("Used Vehicle Export", PAGE_W / 2, FOOTER_Y + 11, {
    align: "center",
  });
  if (total > 1) {
    doc.text(`Page ${page} / ${total}`, PAGE_W - MARGIN, FOOTER_Y + 11, {
      align: "right",
    });
  }
}

function drawIdBlock(
  doc: Pdf,
  labelEn: string,
  labelZh: string,
  value: string,
  x: number,
  y: number,
  w: number
): number {
  setProformaFont(doc, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text(`${labelEn} / ${labelZh}`, x, y);
  return (
    10 +
    putText(doc, value || "—", x, y + 12, {
      fontSize: 10,
      bold: true,
      maxWidth: w,
      lineGap: 2.5,
    })
  );
}

/** Two-line bilingual table header cell. */
function headerCell(
  doc: Pdf,
  en: string,
  zh: string,
  x: number,
  y: number,
  align: "left" | "right" = "left"
) {
  setProformaFont(doc, "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(en, x, y + 8, align === "right" ? { align: "right" } : undefined);
  doc.setFontSize(6.5);
  doc.text(zh, x, y + 17, align === "right" ? { align: "right" } : undefined);
}

function drawVehicleHeader(doc: Pdf, y: number): number {
  const h = 22;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, h, "F");
  headerCell(doc, "No.", "序号", MARGIN + 6, y);
  headerCell(doc, "Brand", "品牌", MARGIN + 28, y);
  headerCell(doc, "Model", "型号", MARGIN + 95, y);
  headerCell(doc, "Year", "年份", MARGIN + 175, y);
  headerCell(doc, "Colour", "颜色", MARGIN + 210, y);
  headerCell(doc, "VIN / Chassis No.", "VIN / 车架号", MARGIN + 260, y);
  headerCell(doc, "Qty", "数量", MARGIN + 395, y, "right");
  headerCell(doc, "Unit Price", "单价", MARGIN + 460, y, "right");
  headerCell(doc, "Amount", "金额", MARGIN + CONTENT_W - 4, y, "right");
  return y + h;
}

function drawVehicleRow(
  doc: Pdf,
  item: ProformaPdfSource["items"][number],
  index: number,
  y: number,
  zebra: boolean
): number {
  const rowH = 22;
  if (zebra) {
    doc.setFillColor(...LIGHT);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);

  setProformaFont(doc, "normal");
  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.text(String(index + 1), MARGIN + 8, y + 14);

  putText(doc, item.brand || "—", MARGIN + 28, y + 13, {
    fontSize: 8.5,
    bold: true,
    maxWidth: 62,
    lineGap: 1.5,
  });
  putText(doc, item.model || "—", MARGIN + 95, y + 13, {
    fontSize: 8.5,
    maxWidth: 74,
    lineGap: 1.5,
  });

  setProformaFont(doc, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(item.year || "—", MARGIN + 175, y + 14);
  putText(doc, item.colour || "—", MARGIN + 210, y + 13, {
    fontSize: 8,
    maxWidth: 46,
    lineGap: 1.5,
  });
  setProformaFont(doc, "normal");
  doc.setFontSize(7.5);
  doc.text((item.vin || "—").slice(0, 17), MARGIN + 260, y + 14);

  doc.setFontSize(9);
  doc.text(String(item.quantity), MARGIN + 395, y + 14, { align: "right" });
  doc.text(formatUsd(item.unitPriceUsd), MARGIN + 460, y + 14, {
    align: "right",
  });
  setProformaFont(doc, "bold");
  doc.text(formatUsd(item.totalUsd), MARGIN + CONTENT_W - 4, y + 14, {
    align: "right",
  });

  return y + rowH;
}

function sectionTitle(doc: Pdf, text: string, y: number): number {
  return (
    y +
    putText(doc, text, MARGIN, y, {
      fontSize: 11.5,
      bold: true,
      color: NAVY,
      maxWidth: CONTENT_W,
      lineGap: 3,
    }) +
    4
  );
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
 * Build and download a real A4 PDF with embedded Noto Sans SC vector text.
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
  drawChrome(doc);
  let y = MARGIN;

  // —— Header ——
  const logoSize = 26; // ~15% larger than prior 22
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, logoSize, logoSize, 3, 3, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(MARGIN + 3, y + 3, logoSize - 6, logoSize - 6, 2, 2, "F");
  setProformaFont(doc, "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.text("FC", MARGIN + logoSize / 2, y + 16.5, { align: "center" });

  setProformaFont(doc, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("FC Auto Export", MARGIN + logoSize + 8, y + 11);
  setProformaFont(doc, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text("Used Vehicle Export", MARGIN + logoSize + 8, y + 22);

  setProformaFont(doc, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text("PROFORMA INVOICE", PAGE_W - MARGIN, y + 13, { align: "right" });
  setProformaFont(doc, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text(
    source.companySnapshot.companyWebsite || "fcautoexport.com",
    PAGE_W - MARGIN,
    y + 25,
    { align: "right" }
  );

  y += logoSize + 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.1);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 12;

  // —— Identifiers ——
  const idW = CONTENT_W / 4;
  const ids: Array<[string, string, string]> = [
    ["Invoice No.", "发票号", source.invoiceNumber],
    [
      "Contract No.",
      "合同号",
      source.contractNumber || source.invoiceNumber,
    ],
    ["Offer Date", "报价日期", source.offerDate],
    ["Validity", "有效期", source.validityText || "7 Days"],
  ];
  let maxIdH = 0;
  ids.forEach(([en, zh, value], i) => {
    maxIdH = Math.max(
      maxIdH,
      drawIdBlock(doc, en, zh, value, MARGIN + i * idW, y, idW - 8)
    );
  });
  y += maxIdH + 8;

  // —— Seller | Buyer ——
  ({ y } = ensureSpace(doc, y, 96));
  const colW = (CONTENT_W - 12) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 12;
  const boxH = 92;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(leftX, y, colW, boxH, 3, 3, "F");
  doc.roundedRect(rightX, y, colW, boxH, 3, 3, "F");

  let sy = y + 12;
  putText(doc, "Seller / 卖方", leftX + 8, sy, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: colW - 16,
  });
  sy += 14;
  const sellerLines: Array<[string, string]> = [
    ["Company", source.companySnapshot.companyName],
    ["Address", source.companySnapshot.companyAddress],
    ["Sales", source.salespersonName],
    ["Phone", source.salespersonPhone],
    ["Email", source.salespersonEmail],
    ["Website", source.companySnapshot.companyWebsite],
  ];
  for (const [label, value] of sellerLines) {
    setProformaFont(doc, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(`${label}:`, leftX + 8, sy);
    putText(doc, value || "—", leftX + 52, sy, {
      fontSize: 8,
      maxWidth: colW - 60,
      lineGap: 1.5,
    });
    sy += 11;
  }

  let by = y + 12;
  putText(doc, "Buyer / 买方", rightX + 8, by, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: colW - 16,
  });
  by += 14;
  const destPort = [source.destinationCountry, source.destinationPort]
    .filter(Boolean)
    .join(" / ");
  const buyerLines: Array<[string, string]> = [
    ["Customer", source.customerName],
    ["Company", source.customerCompany || ""],
    ["Country", source.customerCountry || ""],
    ["WhatsApp", source.customerWhatsapp || ""],
    ["Email", source.customerEmail || ""],
    ["Destination Port", destPort],
  ];
  for (const [label, value] of buyerLines) {
    if (!value && label !== "Customer") continue;
    setProformaFont(doc, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(`${label}:`, rightX + 8, by);
    putText(doc, value || "—", rightX + 78, by, {
      fontSize: 8,
      maxWidth: colW - 86,
      lineGap: 1.5,
    });
    by += 11;
  }

  y += boxH + 10;

  // —— Vehicle table ——
  ({ y } = ensureSpace(doc, y, 48));
  y = sectionTitle(doc, "Vehicle Items / 车辆明细", y);
  y = drawVehicleHeader(doc, y);

  const ROW_H = 22;
  source.items.forEach((item, index) => {
    const space = ensureSpace(doc, y, ROW_H + 4);
    y = space.y;
    if (space.pageBreak) {
      y = sectionTitle(doc, "Vehicle Items / 车辆明细 (cont.)", y);
      y = drawVehicleHeader(doc, y);
    }
    y = drawVehicleRow(doc, item, index, y, index % 2 === 1);
  });
  y += 10;

  // —— Charges + Summary ——
  ({ y } = ensureSpace(doc, y, 100));
  const half = (CONTENT_W - 12) / 2;
  const chargeX = MARGIN;
  const sumX = MARGIN + half + 12;

  putText(doc, "Other Charges / 其他费用", chargeX, y, {
    fontSize: 11,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  putText(doc, "Financial Summary / 金额汇总", sumX, y, {
    fontSize: 11,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  y += 14;

  const chargeStart = y;
  let cy = y;
  const chargeRows =
    source.charges.length > 0
      ? source.charges
      : [{ nameZh: "—", nameEn: "—", amountUsd: 0, note: null }];
  for (const c of chargeRows) {
    putText(
      doc,
      c.nameEn + (c.nameZh ? ` / ${c.nameZh}` : ""),
      chargeX,
      cy,
      { fontSize: 8.5, maxWidth: half - 78, lineGap: 2 }
    );
    setProformaFont(doc, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(formatUsd(c.amountUsd), chargeX + half - 2, cy, {
      align: "right",
    });
    cy += 13;
  }

  let sy2 = chargeStart;
  const summaryH = 78;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(sumX, sy2 - 4, half, summaryH, 3, 3, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(sumX, sy2 - 4, half, summaryH, 3, 3, "S");

  const summary: Array<[string, string, boolean]> = [
    ["Vehicle Total", formatUsd(source.vehicleSubtotalUsd), false],
    ["Other Charges", formatUsd(source.chargesTotalUsd), false],
    ["Grand Total / 总计", formatUsd(source.totalUsd), true],
    ["Deposit / 定金", formatUsd(source.depositUsd), false],
    ["Balance / 尾款", formatUsd(source.balanceUsd), true],
  ];
  for (const [label, value, strong] of summary) {
    putText(doc, label, sumX + 8, sy2 + 8, {
      fontSize: strong ? 9.5 : 8.5,
      color: strong ? NAVY : SLATE,
      bold: strong,
      maxWidth: half - 90,
      lineGap: 2,
    });
    setProformaFont(doc, strong ? "bold" : "normal");
    doc.setFontSize(strong ? 10.5 : 9);
    doc.setTextColor(...(strong ? NAVY : BLACK));
    doc.text(value, sumX + half - 8, sy2 + 8, { align: "right" });
    sy2 += 14;
  }

  y = Math.max(cy, chargeStart + summaryH) + 10;

  // —— Payment ——
  ({ y } = ensureSpace(doc, y, 58));
  y = sectionTitle(doc, "Payment Information / 付款信息", y);
  const pay = source.paymentSnapshot;
  const payCols: Array<[string, string, string]> = [
    ["Beneficiary", "收款人", pay.fullName || "—"],
    ["Bank", "开户银行", pay.bankName || "—"],
    ["Account Number", "银行账号", pay.accountNumber || "—"],
    ["SWIFT", "SWIFT代码", pay.swift || "—"],
  ];
  const pw = CONTENT_W / 4;
  let payH = 0;
  payCols.forEach(([en, zh, value], i) => {
    payH = Math.max(
      payH,
      drawIdBlock(doc, en, zh, value, MARGIN + i * pw, y, pw - 6)
    );
  });
  y += payH + 2;
  if (pay.bankAddress) {
    putText(
      doc,
      `Bank Address / 开户行地址: ${pay.bankAddress}`,
      MARGIN,
      y,
      { fontSize: 8.5, color: SLATE, maxWidth: CONTENT_W, lineGap: 2.5 }
    );
    y += 12;
  }
  if (pay.paymentNote) {
    putText(doc, pay.paymentNote, MARGIN, y, {
      fontSize: 8.5,
      color: SLATE,
      maxWidth: CONTENT_W,
      lineGap: 2.5,
    });
    y += 12;
  }
  y += 4;

  // —— Terms (EN then ZH on separate lines) ——
  const enabledTerms = source.termsSnapshot.filter((t) => t.enabled);
  if (enabledTerms.length || source.notes) {
    ({ y } = ensureSpace(doc, y, 40));
    y = sectionTitle(doc, "Terms / 条款", y);
    enabledTerms.forEach((term, i) => {
      ({ y } = ensureSpace(doc, y, 28));
      if (term.textEn) {
        const h = putText(doc, `${i + 1}. ${term.textEn}`, MARGIN, y, {
          fontSize: 8.5,
          maxWidth: CONTENT_W,
          lineGap: 2.5,
        });
        y += h + 2;
      }
      if (term.textZh) {
        const prefix = term.textEn ? "" : `${i + 1}. `;
        const h = putText(doc, `${prefix}${term.textZh}`, MARGIN + (term.textEn ? 10 : 0), y, {
          fontSize: 8.5,
          color: SLATE,
          maxWidth: CONTENT_W - (term.textEn ? 10 : 0),
          lineGap: 2.5,
        });
        y += h + 5;
      } else {
        y += 4;
      }
    });
    if (source.notes) {
      ({ y } = ensureSpace(doc, y, 16));
      putText(doc, source.notes, MARGIN, y, {
        fontSize: 8.5,
        color: SLATE,
        maxWidth: CONTENT_W,
        lineGap: 2.5,
      });
    }
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }

  const filename = buildProformaPdfFilename(source.invoiceNumber);
  triggerPdfFileDownload(doc, filename);
  return { filename };
}
