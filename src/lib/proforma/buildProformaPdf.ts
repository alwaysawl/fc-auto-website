/**
 * Fixed one-page A4 Proforma Invoice PDF.
 * Uses the shared explicit coordinate map in layout.ts.
 * Exactly 8 visible vehicle rows — no pagination, no autoTable.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  HEADER_HEIGHT,
  HEADER_TOP,
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
  PROFORMA_LAYOUT_VERSION,
  checkProformaOnePageFit,
  compactPaymentValue,
  vehicleRowTop,
} from "@/lib/proforma/layout";
import {
  ensureProformaFonts,
  setProformaFont,
} from "@/lib/proforma/pdfFonts";
import { buildProformaDownloadFilename } from "@/lib/proforma/pdfDownloadName";
import { drawProformaTopInformation } from "@/lib/proforma/drawProformaTopInformation";
import { buildProformaTopInformation } from "@/lib/proforma/topInformationModel";

const NAVY: [number, number, number] = [30, 41, 59];
const GOLD: [number, number, number] = [212, 175, 55];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [248, 250, 252];
const LINE: [number, number, number] = [226, 232, 240];
const BLACK: [number, number, number] = [15, 23, 42];
const WHITE: [number, number, number] = [255, 255, 255];

/** Typography hierarchy (pt). */
const PT_EN = 9;
const PT_ZH = 8.5;
const PT_LABEL = 8.5;
const PT_SECTION = 9.5;
const PT_FOOTER = 7.5;
const PT_LINE_HEIGHT = 1.12;

const MARGIN = PI_MARGIN;
const PAGE_W = PAGE_WIDTH;
const PAGE_H = PAGE_HEIGHT;
const CONTENT_W = PI_CONTENT_W;

/** Same asset as Header BrandLogo and vehicle quotation PDF (`/images/fc-logo.png`, 760×231). */
const SITE_LOGO_NATIVE_W = 760;
const SITE_LOGO_NATIVE_H = 231;
const SITE_LOGO_FILE = "fc-logo.png";

type Pdf = jsPDF;
type HeaderLogo = { dataUrl: string; width: number; height: number };

let cachedSiteLogoDataUrl: string | null | undefined;

function loadSiteLogoPngDataUrl(): string | null {
  if (cachedSiteLogoDataUrl !== undefined) return cachedSiteLogoDataUrl;
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "public", "images", SITE_LOGO_FILE),
    join(cwd, "images", SITE_LOGO_FILE),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      cachedSiteLogoDataUrl = `data:image/png;base64,${readFileSync(candidate).toString("base64")}`;
      return cachedSiteLogoDataUrl;
    } catch {
      break;
    }
  }
  cachedSiteLogoDataUrl = null;
  return null;
}

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
    /** When false, truncate extra lines without adding “…”. */
    ellipsis?: boolean;
  }
): number {
  const fontSize = opts?.fontSize ?? 8.5;
  const color = opts?.color ?? BLACK;
  const maxWidth = opts?.maxWidth ?? CONTENT_W;
  const align = opts?.align ?? "left";
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
        last.length > 1 ? `${last.slice(0, Math.max(1, last.length - 1))}…` : "…";
    }
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

function drawGoldRule(doc: Pdf, y: number) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

/** Header band only — never draws Invoice/Seller/Buyer. */
function drawHeader(doc: Pdf, source: ProformaPdfSource, logo: HeaderLogo | null) {
  const bandTop = HEADER_TOP;
  const usableH = HEADER_HEIGHT - 4;
  const logoH = 18;
  const logoPad = 3;
  const logoW = logo
    ? (logoH * logo.width) / logo.height
    : 26;
  const plateW = logo ? logoW + logoPad * 2 : 26;
  const plateH = logo ? logoH + logoPad * 2 : 26;
  const plateY = bandTop + (usableH - plateH) / 2;
  const midY = plateY + plateH / 2;

  if (logo) {
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, plateY, plateW, plateH, 2.8, 2.8, "F");
    doc.addImage(
      logo.dataUrl,
      "PNG",
      MARGIN + logoPad,
      plateY + logoPad,
      logoW,
      logoH
    );
  } else {
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, plateY, 26, 26, 2.8, 2.8, "F");
    doc.setFillColor(...GOLD);
    doc.roundedRect(MARGIN + 2.8, plateY + 2.8, 20.4, 20.4, 1.6, 1.6, "F");
    setProformaFont(doc, "bold");
    doc.setTextColor(...NAVY);
    doc.setFontSize(9);
    doc.text("FC", MARGIN + 13, plateY + 26 * 0.62, { align: "center" });
  }

  const brandX = MARGIN + plateW + 7;
  setProformaFont(doc, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("FC AUTO EXPORT", brandX, midY - 5);
  setProformaFont(doc, "normal");
  doc.setFontSize(PT_ZH);
  doc.setTextColor(...SLATE);
  doc.text("USED VEHICLE EXPORT", brandX, midY + 7);

  setProformaFont(doc, "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(...NAVY);
  doc.text("PROFORMA INVOICE", PAGE_W / 2, midY - 6, { align: "center" });
  setProformaFont(doc, "normal");
  doc.setFontSize(PT_ZH);
  doc.setTextColor(...GOLD);
  doc.text("形式发票", PAGE_W / 2, midY + 10, { align: "center" });

  const website = source.companySnapshot.companyWebsite || "fcautoexport.com";
  // Keep email clear of the page edge (right margin already applied)
  const contactX = PAGE_W - MARGIN;
  setProformaFont(doc, "normal");
  doc.setFontSize(PT_ZH);
  doc.setTextColor(...SLATE);
  doc.text(website, contactX, midY - 10, { align: "right" });
  setProformaFont(doc, "normal");
  doc.setFontSize(PT_EN);
  doc.setTextColor(...BLACK);
  doc.text(source.salespersonPhone || "", contactX, midY + 1, {
    align: "right",
  });
  doc.text(source.salespersonEmail || "", contactX, midY + 12, {
    align: "right",
  });

  drawGoldRule(doc, HEADER_BOTTOM - 2);
}

function drawFooter(doc: Pdf, source: ProformaPdfSource) {
  const y = FOOTER_TOP;
  drawGoldRule(doc, y);
  setProformaFont(doc, "bold");
  doc.setFontSize(PT_EN);
  doc.setTextColor(...NAVY);
  doc.text("FC AUTO EXPORT", PAGE_W / 2, y + 10, { align: "center" });

  const website = source.companySnapshot.companyWebsite || "fcautoexport.com";
  const phone = source.salespersonPhone || "";
  const email = source.salespersonEmail || "";
  setProformaFont(doc, "normal");
  doc.setFontSize(PT_FOOTER);
  doc.setTextColor(...SLATE);
  // Evenly spaced contact cluster, centered; page number clear on the right
  const contact = [website, phone, email].filter(Boolean).join("   ·   ");
  doc.text(contact, PAGE_W / 2, y + 20, { align: "center" });
  setProformaFont(doc, "bold");
  doc.setFontSize(PT_FOOTER);
  doc.setTextColor(...NAVY);
  doc.text("Page 1 / 1", PAGE_W - MARGIN, y + 20, { align: "right" });
}

function drawVehicleTable(doc: Pdf, source: ProformaPdfSource) {
  putText(doc, "Vehicle Items / 车辆明细", MARGIN, VEHICLE_TITLE_TOP + 11, {
    fontSize: PT_SECTION,
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
    setProformaFont(doc, "bold");
    doc.setFontSize(7);
    const enY = headerY + VEHICLE_HEADER_HEIGHT * 0.38;
    const zhY = headerY + VEHICLE_HEADER_HEIGHT * 0.72;
    if (c.align === "right") {
      doc.text(c.en, c.x, enY, { align: "right" });
      setProformaFont(doc, "normal");
      doc.setFontSize(6.5);
      doc.text(c.zh, c.x, zhY, { align: "right" });
    } else if (c.align === "center") {
      doc.text(c.en, c.x, enY, { align: "center" });
      setProformaFont(doc, "normal");
      doc.setFontSize(6.5);
      doc.text(c.zh, c.x, zhY, { align: "center" });
    } else {
      doc.text(c.en, c.x, enY);
      setProformaFont(doc, "normal");
      doc.setFontSize(6.5);
      doc.text(c.zh, c.x, zhY);
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

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.45);
    doc.rect(MARGIN, rowTop, CONTENT_W, VEHICLE_ROW_HEIGHT, "S");

    const mid = rowTop + Math.floor(VEHICLE_ROW_HEIGHT * 0.65);
    if (item) {
      setProformaFont(doc, "normal");
      doc.setFontSize(PT_ZH);
      doc.setTextColor(...BLACK);
      doc.text(String(index + 1), MARGIN + 8, mid);
      oneLine(doc, item.brand || "—", MARGIN + 24, mid, 60, {
        fontSize: PT_ZH,
        bold: true,
      });
      oneLine(doc, item.model || "—", MARGIN + 88, mid, 74, {
        fontSize: PT_ZH,
        bold: false,
      });
      oneLine(doc, item.year || "—", MARGIN + 168, mid, 28, {
        fontSize: PT_ZH,
      });
      oneLine(doc, item.colour || "—", MARGIN + 200, mid, 44, {
        fontSize: PT_ZH,
      });
      oneLine(doc, (item.vin || "—").slice(0, 22), MARGIN + 248, mid, 130, {
        fontSize: 7.5,
      });
      setProformaFont(doc, "normal");
      doc.setFontSize(PT_ZH);
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

  if (vehicleRowTop(7) + VEHICLE_ROW_HEIGHT !== VEHICLE_TABLE_BOTTOM) {
    throw new Error("VEHICLE_TABLE_BOTTOM mismatch");
  }
}

function drawChargesAndSummary(doc: Pdf, source: ProformaPdfSource) {
  // Absolute fixed Y from shared map (+ BODY_OFFSET_Y) — never table.finalY.
  const y0 = CHARGES_TOP;
  const half = (CONTENT_W - 10) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + half + 10;
  const bandBottom = y0 + CHARGES_HEIGHT;

  putText(doc, "Other Charges / 其他费用", leftX, y0 + 10, {
    fontSize: PT_SECTION,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });
  putText(doc, "Financial Summary / 金额汇总", rightX, y0 + 10, {
    fontSize: PT_SECTION,
    bold: true,
    color: NAVY,
    maxWidth: half,
  });

  let cy = y0 + 24;
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
      half - 78,
      { fontSize: PT_EN, bold: false }
    );
    setProformaFont(doc, "normal");
    doc.setFontSize(PT_EN);
    doc.setTextColor(...BLACK);
    doc.text(formatUsd(c.amountUsd), leftX + half - 8, cy, { align: "right" });
    cy += 12;
  }
  if (cy <= bandBottom - 12) {
    oneLine(doc, "Total Other Charges / 其他费用合计", leftX, cy, half - 78, {
      fontSize: PT_EN,
      bold: true,
    });
    setProformaFont(doc, "bold");
    doc.setFontSize(PT_EN);
    doc.setTextColor(...NAVY);
    doc.text(formatUsd(source.chargesTotalUsd), leftX + half - 8, cy, {
      align: "right",
    });
  }

  // Summary box — gold border, ~9pt inner right padding, subtle separators
  const summaryBoxTop = y0 + 22;
  const boxH = Math.min(70, CHARGES_HEIGHT - 26);
  const sumPadL = 7;
  const sumPadR = 9;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(rightX, summaryBoxTop, half, boxH, 3, 3, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(rightX, summaryBoxTop, half, boxH, 3, 3, "S");

  const summary: Array<[string, string, boolean, boolean]> = [
    ["Vehicle Total / 车辆总价", formatUsd(source.vehicleSubtotalUsd), false, false],
    ["Other Charges / 其他费用", formatUsd(source.chargesTotalUsd), false, false],
    ["Grand Total / 总计", formatUsd(source.totalUsd), true, true],
    ["Deposit / 定金", formatUsd(source.depositUsd), false, false],
    ["Balance / 尾款", formatUsd(source.balanceUsd), true, true],
  ];
  let sy = summaryBoxTop + 11;
  for (const [label, value, strong, ruleBefore] of summary) {
    if (sy > summaryBoxTop + boxH - 6) break;
    if (ruleBefore) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.4);
      doc.line(
        rightX + sumPadL,
        sy - 5,
        rightX + half - sumPadR,
        sy - 5
      );
      sy += 1;
    }
    oneLine(doc, label, rightX + sumPadL, sy, half - sumPadL - sumPadR - 62, {
      fontSize: strong ? PT_EN : PT_ZH,
      bold: strong,
      color: strong ? NAVY : SLATE,
    });
    setProformaFont(doc, strong ? "bold" : "normal");
    doc.setFontSize(strong ? PT_EN : PT_ZH);
    doc.setTextColor(...(strong ? NAVY : BLACK));
    doc.text(value, rightX + half - sumPadR, sy, { align: "right" });
    sy += 11.5;
  }
}

function drawPayment(doc: Pdf, source: ProformaPdfSource) {
  // Fixed map (+ BODY_OFFSET_Y) — never derived from cursor / finalY.
  const y0 = PAYMENT_TOP;
  putText(doc, "Payment Information / 付款信息", MARGIN, y0 + 10, {
    fontSize: PT_SECTION,
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
  const padX = 10;
  const left: Array<[string, string]> = [
    ["Beneficiary / 收款人", compactPaymentValue(pay.fullName)],
    ["Bank / 开户银行", compactPaymentValue(pay.bankName)],
    ["Account Number / 银行账号", compactPaymentValue(pay.accountNumber)],
  ];
  const right: Array<[string, string]> = [
    ["Bank Address / 开户行地址", compactPaymentValue(pay.bankAddress)],
    ["SWIFT / SWIFT代码", compactPaymentValue(pay.swift)],
  ];

  let ly = boxTop + 11;
  for (const [label, value] of left) {
    setProformaFont(doc, "bold");
    doc.setFontSize(PT_LABEL);
    doc.setTextColor(...SLATE);
    const labelText = `${label}: `;
    doc.text(labelText, MARGIN + padX, ly);
    const lw = Math.min(doc.getTextWidth(labelText), colW * 0.55);
    oneLine(doc, value, MARGIN + padX + lw, ly, colW - padX * 2 - lw, {
      fontSize: PT_EN,
      bold: false,
    });
    ly += 11;
  }

  let ry = boxTop + 11;
  for (const [label, value] of right) {
    setProformaFont(doc, "bold");
    doc.setFontSize(PT_LABEL);
    doc.setTextColor(...SLATE);
    const labelText = `${label}: `;
    doc.text(labelText, MARGIN + colW + padX, ry);
    const lw = Math.min(doc.getTextWidth(labelText), colW * 0.5);
    oneLine(doc, value, MARGIN + colW + padX + lw, ry, colW - padX * 2 - lw, {
      fontSize: PT_EN,
      bold: false,
    });
    ry += 11;
  }
}

function drawTerms(doc: Pdf, source: ProformaPdfSource) {
  // Fixed map (+ BODY_OFFSET_Y) — never derived from cursor / finalY.
  let y = TERMS_TOP + 10;
  putText(doc, "Terms / 条款", MARGIN, y, {
    fontSize: PT_SECTION,
    bold: true,
    color: NAVY,
    maxWidth: CONTENT_W,
  });
  y += 14;

  const enabled = source.termsSnapshot.filter((t) => t.enabled);
  const termLineGap = PT_EN * 0.18; // ~1.18 line-height
  for (let i = 0; i < enabled.length; i++) {
    const term = enabled[i]!;
    if (y >= TERMS_MAX_BOTTOM) break;
    if (term.textEn) {
      const h = putText(doc, `${i + 1}. ${term.textEn}`, MARGIN, y, {
        fontSize: PT_EN,
        maxWidth: CONTENT_W,
        lineGap: termLineGap,
      });
      y += h + 1.5;
    }
    if (term.textZh && y < TERMS_MAX_BOTTOM) {
      const h = putText(
        doc,
        term.textEn ? term.textZh : `${i + 1}. ${term.textZh}`,
        MARGIN + (term.textEn ? 8 : 0),
        y,
        {
          fontSize: PT_ZH,
          color: SLATE,
          maxWidth: CONTENT_W - (term.textEn ? 8 : 0),
          lineGap: PT_ZH * 0.18,
        }
      );
      y += h + 4.5;
    }
  }

  if (source.notes && y < TERMS_MAX_BOTTOM) {
    putText(doc, source.notes, MARGIN, y, {
      fontSize: PT_ZH,
      color: SLATE,
      maxWidth: CONTENT_W,
      lineGap: PT_ZH * (PT_LINE_HEIGHT - 1),
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
 * Build a real single-page A4 PDF (server or client). Returns raw bytes.
 */
export async function buildProformaPdfBytes(
  source: ProformaPdfSource
): Promise<{ bytes: Uint8Array; filename: string }> {
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

  // Non-visual deploy diagnostic (not drawn on PDF)
  console.info("[proforma-layout]", PROFORMA_LAYOUT_VERSION);

  const logoDataUrl = loadSiteLogoPngDataUrl();
  const headerLogo: HeaderLogo | null = logoDataUrl
    ? {
        dataUrl: logoDataUrl,
        width: SITE_LOGO_NATIVE_W,
        height: SITE_LOGO_NATIVE_H,
      }
    : null;

  drawHeader(doc, source, headerLogo);
  drawProformaTopInformation(
    doc,
    buildProformaTopInformation({
      invoiceNumber: source.invoiceNumber,
      contractNumber: source.contractNumber || source.invoiceNumber,
      offerDate: source.offerDate,
      validityText: source.validityText || "",
      customerName: source.customerName,
      customerCompany: source.customerCompany || "",
      customerCountry: source.customerCountry || "",
      customerWhatsapp: source.customerWhatsapp || "",
      customerEmail: source.customerEmail || "",
      destinationCountry: source.destinationCountry || "",
      destinationPort: source.destinationPort || "",
      salespersonName: source.salespersonName,
      salespersonPhone: source.salespersonPhone,
      salespersonEmail: source.salespersonEmail,
      companyName: source.companySnapshot.companyName,
      companyAddress: source.companySnapshot.companyAddress,
      companyWebsite: source.companySnapshot.companyWebsite || "",
    })
  );
  drawVehicleTable(doc, source);
  drawChargesAndSummary(doc, source);
  drawPayment(doc, source);
  drawTerms(doc, source);
  drawFooter(doc, source);

  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  return {
    bytes: new Uint8Array(arrayBuffer),
    filename: buildProformaDownloadFilename(source.invoiceNumber),
  };
}
