/**
 * Compact A4 Proforma Invoice PDF V2 (jsPDF).
 * Uses exact saved invoice snapshots — does not recalculate live prices.
 * Does not rewrite historical terms.
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
import { renderTextBitmap } from "@/lib/vehicleQuote/images";

const NAVY: [number, number, number] = [30, 41, 59];
const GOLD: [number, number, number] = [212, 175, 55];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [248, 250, 252];
const LINE: [number, number, number] = [226, 232, 240];
const BLACK: [number, number, number] = [15, 23, 42];

/** Compact A4 margins for single-page fit when content allows. */
const MARGIN = 28;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 22;
const BODY = 8.5;

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

function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
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
  }
): number {
  const fontSize = opts?.fontSize ?? BODY;
  const color = opts?.color ?? BLACK;
  const maxWidth = opts?.maxWidth ?? CONTENT_W;
  const align = opts?.align ?? "left";
  if (!text) return fontSize * 0.2;

  if (hasCjk(text)) {
    const bmp = renderTextBitmap(text, {
      fontSize: fontSize * 1.3,
      color: `rgb(${color[0]},${color[1]},${color[2]})`,
      fontWeight: opts?.bold ? "700" : "400",
      maxWidth: maxWidth * 1.3,
      align,
      locale: "zh",
    });
    if (!bmp.dataUrl) return fontSize + 1;
    const drawW = Math.min(maxWidth, bmp.width * 0.72);
    const drawH = bmp.height * 0.72;
    const drawX =
      align === "right"
        ? x - drawW
        : align === "center"
          ? x - drawW / 2
          : x;
    doc.addImage(bmp.dataUrl, "PNG", drawX, y - fontSize + 1, drawW, drawH);
    return Math.max(fontSize + 1, drawH + 1);
  }

  doc.setTextColor(...color);
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y, { align });
  return lines.length * (fontSize + 1.5);
}

function ensureSpace(
  doc: Pdf,
  y: number,
  need: number
): { y: number; pageBreak: boolean } {
  if (y + need <= FOOTER_Y - 6) return { y, pageBreak: false };
  doc.addPage();
  drawChrome(doc);
  return { y: MARGIN + 10, pageBreak: true };
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
  doc.rect(0, 0, PAGE_W, 2.5, "F");
}

function drawFooter(doc: Pdf, page: number, total: number) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, FOOTER_Y - 6, PAGE_W - MARGIN, FOOTER_Y - 6);
  doc.setTextColor(...SLATE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("FC Auto Export  ·  fcautoexport.com", MARGIN, FOOTER_Y);
  if (total > 1) {
    doc.text(`Page ${page} / ${total}`, PAGE_W - MARGIN, FOOTER_Y, {
      align: "right",
    });
  }
}

function kv(
  doc: Pdf,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number
): number {
  let cy = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE);
  doc.text(label, x, cy);
  cy += 9;
  cy += putText(doc, value || "—", x, cy, {
    fontSize: 8,
    bold: true,
    maxWidth: w,
  });
  return cy - y + 2;
}

function drawVehicleHeader(doc: Pdf, y: number): number {
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const cols: Array<{ t: string; x: number; align?: "right" }> = [
    { t: "No.", x: MARGIN + 4 },
    { t: "Brand / Model", x: MARGIN + 22 },
    { t: "Year", x: MARGIN + 178 },
    { t: "Colour", x: MARGIN + 208 },
    { t: "VIN / Chassis No.", x: MARGIN + 255 },
    { t: "Qty", x: MARGIN + 390, align: "right" },
    { t: "Unit Price", x: MARGIN + 455, align: "right" },
    { t: "Amount", x: MARGIN + CONTENT_W - 4, align: "right" },
  ];
  for (const c of cols) {
    doc.text(c.t, c.x, y + 9.5, c.align ? { align: c.align } : undefined);
  }
  return y + 14;
}

function drawVehicleRow(
  doc: Pdf,
  item: ProformaPdfSource["items"][number],
  index: number,
  y: number,
  zebra: boolean
): number {
  const rowH = 20;
  if (zebra) {
    doc.setFillColor(...LIGHT);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);

  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(String(index + 1), MARGIN + 6, y + 12);

  putText(doc, `${item.brand} ${item.model}`.trim(), MARGIN + 22, y + 11, {
    fontSize: 7.5,
    bold: true,
    maxWidth: 150,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  doc.text(item.year || "—", MARGIN + 178, y + 12);
  putText(doc, item.colour || "—", MARGIN + 208, y + 11, {
    fontSize: 7,
    maxWidth: 44,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text((item.vin || "—").slice(0, 18), MARGIN + 255, y + 12);

  doc.setFontSize(7.5);
  doc.text(String(item.quantity), MARGIN + 390, y + 12, { align: "right" });
  doc.text(formatUsd(item.unitPriceUsd), MARGIN + 455, y + 12, {
    align: "right",
  });
  doc.setFont("helvetica", "bold");
  doc.text(formatUsd(item.totalUsd), MARGIN + CONTENT_W - 4, y + 12, {
    align: "right",
  });

  return y + rowH;
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
    // Preserve exact saved historical terms (no silent rewrite).
    termsSnapshot: detail.termsSnapshot,
    notes: detail.notes,
    items: detail.items,
    charges: detail.charges,
  };
}

/**
 * Build and download a real compact A4 PDF file.
 * Filename: `{invoiceNumber}.pdf`
 */
export async function downloadProformaPdf(
  source: ProformaPdfSource
): Promise<{ filename: string }> {
  if (!source.invoiceNumber?.trim()) {
    throw new Error("缺少发票编号，无法生成 PDF");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawChrome(doc);
  let y = MARGIN;

  // —— A. Header ——
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, 22, 22, 2, 2, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(MARGIN + 2.5, y + 2.5, 17, 17, 1.5, 1.5, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FC", MARGIN + 11, y + 14, { align: "center" });

  doc.setFontSize(12);
  doc.text("FC Auto Export", MARGIN + 28, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text("Used Vehicle Export", MARGIN + 28, y + 20);

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PROFORMA INVOICE", PAGE_W - MARGIN, y + 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text(
    source.companySnapshot.companyWebsite || "fcautoexport.com",
    PAGE_W - MARGIN,
    y + 20,
    { align: "right" }
  );

  y += 28;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  // —— B. Invoice identifiers ——
  const idW = CONTENT_W / 4;
  const ids: Array<[string, string]> = [
    ["Invoice No. / 发票编号", source.invoiceNumber],
    [
      "Contract No. / 合同号",
      source.contractNumber || source.invoiceNumber,
    ],
    ["Offer Date / 报价日期", source.offerDate],
    ["Validity / 有效期", source.validityText || "7 Days"],
  ];
  let maxIdH = 0;
  ids.forEach(([label, value], i) => {
    const h = kv(doc, label, value, MARGIN + i * idW, y, idW - 8);
    maxIdH = Math.max(maxIdH, h);
  });
  y += maxIdH + 4;

  // —— C. Seller | Buyer ——
  ({ y } = ensureSpace(doc, y, 78));
  const colW = (CONTENT_W - 10) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 10;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(leftX, y, colW, 72, 3, 3, "F");
  doc.roundedRect(rightX, y, colW, 72, 3, 3, "F");

  let sy = y + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text("Seller / 卖方", leftX + 6, sy);
  sy += 10;
  sy += putText(doc, source.companySnapshot.companyName, leftX + 6, sy, {
    fontSize: 7.5,
    bold: true,
    maxWidth: colW - 12,
  });
  sy += putText(doc, source.companySnapshot.companyAddress, leftX + 6, sy, {
    fontSize: 6.5,
    color: SLATE,
    maxWidth: colW - 12,
  });
  sy += 2;
  putText(
    doc,
    `${source.salespersonName}  ·  ${source.salespersonPhone}`,
    leftX + 6,
    sy,
    { fontSize: 7, maxWidth: colW - 12 }
  );
  sy += 9;
  putText(
    doc,
    `${source.salespersonEmail}  ·  ${source.companySnapshot.companyWebsite}`,
    leftX + 6,
    sy,
    { fontSize: 6.5, color: SLATE, maxWidth: colW - 12 }
  );

  let by = y + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text("Buyer / 买方", rightX + 6, by);
  by += 10;
  by += putText(doc, source.customerName || "—", rightX + 6, by, {
    fontSize: 7.5,
    bold: true,
    maxWidth: colW - 12,
  });
  if (source.customerCompany) {
    by += putText(doc, source.customerCompany, rightX + 6, by, {
      fontSize: 7,
      maxWidth: colW - 12,
    });
  }
  const buyerBits = [
    source.customerCountry,
    source.customerWhatsapp ? `WA: ${source.customerWhatsapp}` : null,
    source.customerEmail,
  ].filter(Boolean);
  if (buyerBits.length) {
    by += putText(doc, buyerBits.join("  ·  "), rightX + 6, by, {
      fontSize: 6.5,
      color: SLATE,
      maxWidth: colW - 12,
    });
  }
  const dest = [source.destinationCountry, source.destinationPort]
    .filter(Boolean)
    .join(" / ");
  if (dest) {
    by += putText(doc, `Destination: ${dest}`, rightX + 6, by, {
      fontSize: 7,
      maxWidth: colW - 12,
    });
  }

  y += 78;

  // —— D. Vehicle table ——
  ({ y } = ensureSpace(doc, y, 36));
  putText(doc, "Vehicle Items / 车辆明细", MARGIN, y, {
    fontSize: 8.5,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 11;
  y = drawVehicleHeader(doc, y);

  const ROW_H = 20;
  source.items.forEach((item, index) => {
    const space = ensureSpace(doc, y, ROW_H + 2);
    y = space.y;
    if (space.pageBreak) {
      putText(doc, "Vehicle Items / 车辆明细 (cont.)", MARGIN, y, {
        fontSize: 8,
        bold: true,
        color: NAVY,
        maxWidth: CONTENT_W,
      });
      y += 10;
      y = drawVehicleHeader(doc, y);
    }
    y = drawVehicleRow(doc, item, index, y, index % 2 === 1);
  });
  y += 8;

  // —— E. Charges + Summary two columns ——
  ({ y } = ensureSpace(doc, y, 88));
  const half = (CONTENT_W - 10) / 2;
  const chargeX = MARGIN;
  const sumX = MARGIN + half + 10;

  putText(doc, "Other Charges / 其他费用", chargeX, y, {
    fontSize: 8,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  putText(doc, "Financial Summary / 金额汇总", sumX, y, {
    fontSize: 8,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  y += 11;

  const chargeStart = y;
  let cy = y;
  const chargeRows =
    source.charges.length > 0
      ? source.charges
      : [{ nameZh: "—", nameEn: "—", amountUsd: 0, note: null }];
  for (const c of chargeRows) {
    putText(doc, `${c.nameEn}${c.nameZh ? ` / ${c.nameZh}` : ""}`, chargeX, cy, {
      fontSize: 7,
      maxWidth: half - 70,
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    doc.text(formatUsd(c.amountUsd), chargeX + half - 2, cy, {
      align: "right",
    });
    cy += 11;
  }

  let sy2 = chargeStart;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(sumX, sy2 - 2, half, 70, 3, 3, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.roundedRect(sumX, sy2 - 2, half, 70, 3, 3, "S");

  const summary: Array<[string, string, boolean]> = [
    ["Vehicle Total / 车辆合计", formatUsd(source.vehicleSubtotalUsd), false],
    ["Other Charges / 其他费用", formatUsd(source.chargesTotalUsd), false],
    ["Grand Total / 总计", formatUsd(source.totalUsd), true],
    ["Deposit / 定金", formatUsd(source.depositUsd), false],
    ["Balance / 尾款", formatUsd(source.balanceUsd), true],
  ];
  for (const [label, value, strong] of summary) {
    putText(doc, label, sumX + 6, sy2 + 8, {
      fontSize: 6.5,
      color: strong ? NAVY : SLATE,
      bold: strong,
      maxWidth: half - 80,
    });
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setFontSize(strong ? 8 : 7.5);
    doc.setTextColor(...(strong ? NAVY : BLACK));
    doc.text(value, sumX + half - 6, sy2 + 8, { align: "right" });
    sy2 += 12;
  }

  y = Math.max(cy, chargeStart + 72) + 8;

  // —— F. Payment ——
  ({ y } = ensureSpace(doc, y, 52));
  putText(doc, "Payment Information / 付款信息", MARGIN, y, {
    fontSize: 8,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 10;
  const pay = source.paymentSnapshot;
  const payCols: Array<[string, string]> = [
    ["Beneficiary / 收款人", pay.fullName || "—"],
    ["Bank / 银行", pay.bankName || "—"],
    ["Account / 账号", pay.accountNumber || "—"],
    ["SWIFT", pay.swift || "—"],
  ];
  const pw = CONTENT_W / 4;
  payCols.forEach(([label, value], i) => {
    kv(doc, label, value, MARGIN + i * pw, y, pw - 6);
  });
  y += 24;
  if (pay.bankAddress) {
    putText(doc, `Bank Address / 银行地址: ${pay.bankAddress}`, MARGIN, y, {
      fontSize: 7,
      color: SLATE,
      maxWidth: CONTENT_W,
    });
    y += 10;
  }
  if (pay.paymentNote) {
    putText(doc, pay.paymentNote, MARGIN, y, {
      fontSize: 7,
      color: SLATE,
      maxWidth: CONTENT_W,
    });
    y += 10;
  }
  y += 2;

  // —— G. Compact terms (exact saved snapshot) ——
  const enabledTerms = source.termsSnapshot.filter((t) => t.enabled);
  if (enabledTerms.length || source.notes) {
    ({ y } = ensureSpace(doc, y, 36));
    putText(doc, "Terms / 条款", MARGIN, y, {
      fontSize: 8,
      bold: true,
      color: NAVY,
      maxWidth: CONTENT_W,
    });
    y += 10;
    enabledTerms.forEach((term, i) => {
      ({ y } = ensureSpace(doc, y, 18));
      const line = term.textEn
        ? `${i + 1}. ${term.textEn}${term.textZh ? ` ｜ ${term.textZh}` : ""}`
        : `${i + 1}. ${term.textZh}`;
      const h = putText(doc, line, MARGIN, y, {
        fontSize: 7,
        maxWidth: CONTENT_W,
      });
      y += h + 1;
    });
    if (source.notes) {
      ({ y } = ensureSpace(doc, y, 14));
      putText(doc, source.notes, MARGIN, y, {
        fontSize: 7,
        color: SLATE,
        maxWidth: CONTENT_W,
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
