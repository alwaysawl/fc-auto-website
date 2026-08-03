/**
 * Client-side Proforma Invoice PDF (jsPDF A4).
 * Regenerates from saved invoice snapshots — does not recalculate live prices.
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

const MARGIN = 36;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 28;

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
  const fontSize = opts?.fontSize ?? 9;
  const color = opts?.color ?? BLACK;
  const maxWidth = opts?.maxWidth ?? CONTENT_W;
  const align = opts?.align ?? "left";

  if (hasCjk(text)) {
    const bmp = renderTextBitmap(text, {
      fontSize: fontSize * 1.35,
      color: `rgb(${color[0]},${color[1]},${color[2]})`,
      fontWeight: opts?.bold ? "700" : "400",
      maxWidth: maxWidth * 1.35,
      align,
      locale: "zh",
    });
    if (!bmp.dataUrl) return fontSize + 2;
    const drawW = Math.min(maxWidth, bmp.width * 0.75);
    const drawH = bmp.height * 0.75;
    const drawX =
      align === "right"
        ? x - drawW
        : align === "center"
          ? x - drawW / 2
          : x;
    doc.addImage(bmp.dataUrl, "PNG", drawX, y - fontSize + 1, drawW, drawH);
    return drawH + 2;
  }

  doc.setTextColor(...color);
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y, { align });
  return lines.length * (fontSize + 2);
}

function labelValue(
  doc: Pdf,
  labelZh: string,
  labelEn: string,
  value: string,
  x: number,
  y: number,
  width: number
): number {
  let cy = y;
  cy += putText(doc, `${labelZh} / ${labelEn}`, x, cy, {
    fontSize: 7.5,
    color: SLATE,
    maxWidth: width,
  });
  cy += 2;
  cy += putText(doc, value || "—", x, cy, {
    fontSize: 9,
    bold: true,
    maxWidth: width,
  });
  return cy - y + 6;
}

/** Returns [y, didPageBreak]. */
function ensureSpace(
  doc: Pdf,
  y: number,
  need: number
): { y: number; pageBreak: boolean } {
  if (y + need <= FOOTER_Y - 8) return { y, pageBreak: false };
  doc.addPage();
  drawPageChrome(doc);
  return { y: MARGIN + 16, pageBreak: true };
}

/** Safe download filename from invoice number, e.g. PI-20260803-0001.pdf */
export function buildProformaPdfFilename(invoiceNumber: string): string {
  const safe = (invoiceNumber || "proforma")
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safe || "proforma"}.pdf`;
}

/** Trigger a real application/pdf file download (not print/HTML). */
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

function drawPageChrome(doc: Pdf) {
  // top gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, PAGE_W, 3, "F");
}

function drawFooter(doc: Pdf, page: number, total: number) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, FOOTER_Y - 8, PAGE_W - MARGIN, FOOTER_Y - 8);
  doc.setTextColor(...SLATE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("FC Auto Export  ·  fcautoexport.com", MARGIN, FOOTER_Y);
  doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, FOOTER_Y, {
    align: "right",
  });
}

function drawVehicleTableHeader(doc: Pdf, y: number): number {
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const cols = [
    { t: "No.", x: MARGIN + 4 },
    { t: "Brand / Model", x: MARGIN + 28 },
    { t: "Year", x: MARGIN + 200 },
    { t: "Colour", x: MARGIN + 235 },
    { t: "VIN", x: MARGIN + 290 },
    { t: "Unit", x: MARGIN + 400 },
    { t: "Qty", x: MARGIN + 470 },
    { t: "Total", x: MARGIN + 500 },
  ];
  for (const c of cols) {
    doc.text(c.t, c.x, y + 12);
  }
  return y + 18;
}

function drawVehicleRow(
  doc: Pdf,
  item: ProformaPdfSource["items"][number],
  index: number,
  y: number,
  zebra: boolean
): number {
  const rowH = 28;
  if (zebra) {
    doc.setFillColor(...LIGHT);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);

  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(String(index + 1), MARGIN + 6, y + 12);

  const title = `${item.brand} ${item.model}`.trim();
  putText(doc, title, MARGIN + 28, y + 11, {
    fontSize: 8,
    bold: true,
    maxWidth: 165,
  });
  if (item.note) {
    putText(doc, item.note, MARGIN + 28, y + 21, {
      fontSize: 6.5,
      color: SLATE,
      maxWidth: 165,
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(item.year || "—", MARGIN + 200, y + 12);
  putText(doc, item.colour || "—", MARGIN + 235, y + 11, {
    fontSize: 7.5,
    maxWidth: 50,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text((item.vin || "—").slice(0, 20), MARGIN + 290, y + 12);
  doc.setFontSize(7.5);
  doc.text(formatUsd(item.unitPriceUsd), MARGIN + 400, y + 12);
  doc.text(String(item.quantity), MARGIN + 476, y + 12);
  doc.setFont("helvetica", "bold");
  doc.text(formatUsd(item.totalUsd), MARGIN + 500, y + 12);

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
    termsSnapshot: detail.termsSnapshot,
    notes: detail.notes,
    items: detail.items,
    charges: detail.charges,
  };
}

/**
 * Build and download a real A4 PDF file via jsPDF.
 * Filename: `{invoiceNumber}.pdf` (e.g. PI-20260803-0001.pdf).
 * Uses exact values from `source` (saved invoice snapshot) — no live price recalculation.
 */
export async function downloadProformaPdf(
  source: ProformaPdfSource
): Promise<{ filename: string }> {
  if (!source.invoiceNumber?.trim()) {
    throw new Error("缺少发票编号，无法生成 PDF");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawPageChrome(doc);

  let y = MARGIN;

  // Header
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, 28, 28, 3, 3, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(MARGIN + 3, y + 3, 22, 22, 2, 2, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FC", MARGIN + 14, y + 18, { align: "center" });

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FC Auto Export", MARGIN + 38, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(source.companySnapshot.companyWebsite || "fcautoexport.com", MARGIN + 38, y + 26);

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PROFORMA INVOICE", PAGE_W - MARGIN, y + 14, { align: "right" });
  putText(doc, "形式发票", PAGE_W - MARGIN, y + 28, {
    fontSize: 9,
    color: GOLD,
    align: "right",
    maxWidth: 160,
  });

  y += 42;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 16;

  // Invoice + customer meta (two columns)
  const colW = (CONTENT_W - 16) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 16;
  let leftY = y;
  let rightY = y;

  leftY += labelValue(
    doc,
    "发票编号",
    "Invoice No.",
    source.invoiceNumber,
    leftX,
    leftY,
    colW
  );
  leftY += labelValue(
    doc,
    "合同号",
    "Contract No.",
    source.contractNumber || source.invoiceNumber,
    leftX,
    leftY,
    colW
  );
  leftY += labelValue(
    doc,
    "报价日期",
    "Offer Date",
    source.offerDate,
    leftX,
    leftY,
    colW
  );
  leftY += labelValue(
    doc,
    "有效期",
    "Validity",
    source.validityText || "—",
    leftX,
    leftY,
    colW
  );

  rightY += labelValue(
    doc,
    "收货方",
    "To",
    source.customerName,
    rightX,
    rightY,
    colW
  );
  if (source.customerCompany) {
    rightY += labelValue(
      doc,
      "客户公司",
      "Company",
      source.customerCompany,
      rightX,
      rightY,
      colW
    );
  }
  if (source.customerCountry || source.customerAddress) {
    rightY += labelValue(
      doc,
      "地址",
      "Address",
      [source.customerCountry, source.customerAddress].filter(Boolean).join(" · "),
      rightX,
      rightY,
      colW
    );
  }
  if (source.destinationCountry || source.destinationPort) {
    rightY += labelValue(
      doc,
      "目的地",
      "Destination",
      [source.destinationCountry, source.destinationPort]
        .filter(Boolean)
        .join(" / "),
      rightX,
      rightY,
      colW
    );
  }

  y = Math.max(leftY, rightY) + 8;

  // Seller block
  ({ y } = ensureSpace(doc, y, 70));
  doc.setFillColor(...LIGHT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 62, 4, 4, "F");
  let sy = y + 12;
  putText(doc, "卖方 / Seller", MARGIN + 10, sy, {
    fontSize: 8,
    color: SLATE,
    bold: true,
    maxWidth: CONTENT_W - 20,
  });
  sy += 12;
  putText(doc, source.companySnapshot.companyName, MARGIN + 10, sy, {
    fontSize: 9,
    bold: true,
    maxWidth: CONTENT_W - 20,
  });
  sy += 12;
  putText(doc, source.companySnapshot.companyAddress, MARGIN + 10, sy, {
    fontSize: 7.5,
    color: SLATE,
    maxWidth: CONTENT_W - 20,
  });
  sy += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(
    `Sales: ${source.salespersonName}  ·  ${source.salespersonPhone}  ·  ${source.salespersonEmail}`,
    MARGIN + 10,
    sy
  );
  y += 74;

  // Vehicles — multi-page A4 with repeated table headers
  ({ y } = ensureSpace(doc, y, 50));
  putText(doc, "车辆明细 / Vehicle Items", MARGIN, y, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 14;
  y = drawVehicleTableHeader(doc, y);

  const ROW_H = 28;
  source.items.forEach((item, index) => {
    const space = ensureSpace(doc, y, ROW_H + 4);
    y = space.y;
    if (space.pageBreak) {
      // Continuation pages: chrome + repeated vehicle table header
      putText(doc, "车辆明细 / Vehicle Items (续)", MARGIN, y, {
        fontSize: 9,
        bold: true,
        color: NAVY,
        maxWidth: CONTENT_W,
      });
      y += 12;
      y = drawVehicleTableHeader(doc, y);
    }
    y = drawVehicleRow(doc, item, index, y, index % 2 === 1);
  });

  y += 12;

  // Charges
  if (source.charges.some((c) => c.amountUsd > 0) || source.charges.length) {
    ({ y } = ensureSpace(doc, y, 40));
    putText(doc, "其他费用 / Other Charges", MARGIN, y, {
      fontSize: 10,
      bold: true,
      color: NAVY,
      maxWidth: CONTENT_W,
    });
    y += 12;
    for (const charge of source.charges) {
      ({ y } = ensureSpace(doc, y, 16));
      putText(
        doc,
        `${charge.nameZh} / ${charge.nameEn}`,
        MARGIN,
        y,
        { fontSize: 8, maxWidth: CONTENT_W - 120 }
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      doc.text(formatUsd(charge.amountUsd), PAGE_W - MARGIN, y, {
        align: "right",
      });
      y += 14;
    }
    y += 6;
  }

  // Financial summary
  ({ y } = ensureSpace(doc, y, 100));
  const boxX = PAGE_W - MARGIN - 220;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(boxX, y, 220, 92, 4, 4, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(boxX, y, 220, 92, 4, 4, "S");

  const rows: Array<[string, string, boolean]> = [
    ["车辆小计 / Vehicle Subtotal", formatUsd(source.vehicleSubtotalUsd), false],
    ["其他费用 / Other Charges", formatUsd(source.chargesTotalUsd), false],
    ["总计 / TOTAL", formatUsd(source.totalUsd), true],
    ["定金 / Deposit", formatUsd(source.depositUsd), false],
    ["尾款 / Balance", formatUsd(source.balanceUsd), true],
  ];
  let fy = y + 14;
  for (const [label, value, bold] of rows) {
    putText(doc, label, boxX + 10, fy, {
      fontSize: 7.5,
      color: bold ? NAVY : SLATE,
      bold,
      maxWidth: 120,
    });
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(...(bold ? NAVY : BLACK));
    doc.text(value, boxX + 210, fy, { align: "right" });
    fy += 15;
  }
  y += 104;

  // Payment
  ({ y } = ensureSpace(doc, y, 90));
  putText(doc, "付款信息 / Payment Information", MARGIN, y, {
    fontSize: 10,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 14;
  const pay = source.paymentSnapshot;
  const payLines = [
    ["收款人 / Full Name", pay.fullName],
    ["银行 / Bank", pay.bankName],
    ["账号 / Account", pay.accountNumber],
    ["SWIFT", pay.swift],
    ["银行地址 / Bank Address", pay.bankAddress],
    ["备注 / Note", pay.paymentNote],
  ];
  for (const [label, value] of payLines) {
    if (!value) continue;
    ({ y } = ensureSpace(doc, y, 14));
    putText(doc, `${label}: ${value}`, MARGIN, y, {
      fontSize: 8,
      maxWidth: CONTENT_W,
    });
    y += 12;
  }
  y += 8;

  // Terms
  const enabledTerms = source.termsSnapshot.filter((t) => t.enabled);
  if (enabledTerms.length || source.notes) {
    ({ y } = ensureSpace(doc, y, 40));
    putText(doc, "条款与说明 / Terms & Notes", MARGIN, y, {
      fontSize: 10,
      bold: true,
      color: NAVY,
      maxWidth: CONTENT_W,
    });
    y += 14;
    enabledTerms.forEach((term, i) => {
      ({ y } = ensureSpace(doc, y, 28));
      const zhH = putText(doc, `${i + 1}. ${term.textZh}`, MARGIN, y, {
        fontSize: 8,
        maxWidth: CONTENT_W,
      });
      y += zhH;
      const enH = putText(doc, term.textEn, MARGIN + 10, y, {
        fontSize: 7.5,
        color: SLATE,
        maxWidth: CONTENT_W - 10,
      });
      y += enH + 4;
    });
    if (source.notes) {
      ({ y } = ensureSpace(doc, y, 20));
      putText(doc, source.notes, MARGIN, y, {
        fontSize: 8,
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
