import { jsPDF } from "jspdf";
import type { Locale, Vehicle } from "@/lib/types";
import { getVehicleQuoteCopy } from "@/lib/vehicleQuote/copy";
import { assignNextQuoteContact } from "@/lib/vehicleQuote/contacts";
import {
  buildQuoteFilename,
  buildQuoteSpecRows,
  collectQuoteImageUrls,
  formatQuoteDate,
  formatQuotePrice,
  statusLabelForQuote,
} from "@/lib/vehicleQuote/helpers";
import {
  loadPngAsDataUrl,
  loadQuoteImages,
  renderTextBitmap,
} from "@/lib/vehicleQuote/images";

const NAVY: [number, number, number] = [26, 35, 50];
const YELLOW: [number, number, number] = [245, 198, 54];
const WHITE: [number, number, number] = [255, 255, 255];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [248, 250, 252];

type Pdf = jsPDF;

function addFooter(
  doc: Pdf,
  copy: ReturnType<typeof getVehicleQuoteCopy>,
  whatsappDisplay: string
) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...NAVY);
  doc.rect(0, h - 14, w, 14, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${copy.companyName}  ·  ${copy.website}`, 12, h - 6);
  doc.text(copy.websiteUrl, w / 2, h - 6, { align: "center" });
  doc.text(whatsappDisplay, w - 12, h - 6, { align: "right" });
}

function finalizePageNumbers(
  doc: Pdf,
  copy: ReturnType<typeof getVehicleQuoteCopy>
) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(w - 52, h - 14, 52, 14, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const label = copy.pageOf
      .replace("{page}", String(i))
      .replace("{pages}", String(total));
    doc.text(label, w - 10, h - 6, { align: "right" });
  }
}

function drawHeaderBar(
  doc: Pdf,
  copy: ReturnType<typeof getVehicleQuoteCopy>,
  whatsappDisplay: string
) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 28, "F");
  doc.setFillColor(...YELLOW);
  doc.roundedRect(10, 7, 14, 14, 2, 2, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FC", 17, 16, { align: "center" });
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.text(copy.companyName, 28, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 220);
  doc.text(copy.tagline, 28, 20);
  doc.setTextColor(...YELLOW);
  doc.setFontSize(8);
  doc.text(copy.website, w - 12, 13, { align: "right" });
  doc.setTextColor(...WHITE);
  doc.text(whatsappDisplay, w - 12, 20, { align: "right" });
}

function putBitmap(
  doc: Pdf,
  value: string,
  x: number,
  y: number,
  opts: {
    fontSize: number;
    color?: string;
    fontWeight?: string;
    maxWidthPt: number;
    locale: Locale;
    align?: "left" | "center" | "right";
  }
): number {
  const scale = 2;
  const bmp = renderTextBitmap(value, {
    fontSize: opts.fontSize * scale,
    color: opts.color,
    fontWeight: opts.fontWeight,
    maxWidth: opts.maxWidthPt * scale,
    locale: opts.locale,
    align: opts.align ?? "left",
  });
  if (!bmp.dataUrl) return 0;
  const drawW = bmp.width / scale;
  const drawH = bmp.height / scale;
  let drawX = x;
  if (opts.align === "center") drawX = x - drawW / 2;
  if (opts.align === "right") drawX = x - drawW;
  doc.addImage(bmp.dataUrl, "PNG", drawX, y, drawW, drawH);
  return drawH;
}

/**
 * Generate and trigger download of a vehicle quotation PDF in the active locale.
 */
export async function downloadVehicleQuotePdf(
  vehicle: Vehicle,
  locale: Locale
): Promise<void> {
  const copy = getVehicleQuoteCopy(locale);
  const contact = assignNextQuoteContact();
  const whatsappDisplay = contact.whatsappDisplay;
  const useBitmap = locale === "zh";
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentW = pageW - margin * 2;

  const imageUrls = collectQuoteImageUrls(vehicle);
  const images = await loadQuoteImages(imageUrls, 4);
  const mainImage = images[0] ?? null;
  const extraImages = images.slice(1, 4);
  const qrDataUrl = await loadPngAsDataUrl(contact.qrPath);

  const vehicleName =
    vehicle.titleEn?.trim() || `${vehicle.brand} ${vehicle.model}`;
  const price = formatQuotePrice(vehicle);
  const status = statusLabelForQuote(vehicle.status, locale);
  const quoteDate = formatQuoteDate(locale);

  drawHeaderBar(doc, copy, whatsappDisplay);
  let y = 42;

  const text = (
    value: string,
    x: number,
    yy: number,
    size: number,
    options?: {
      bold?: boolean;
      color?: [number, number, number];
      maxWidth?: number;
      align?: "left" | "center" | "right";
    }
  ): number => {
    const color = options?.color ?? NAVY;
    const maxWidth = options?.maxWidth ?? contentW;
    if (useBitmap) {
      return putBitmap(doc, value, x, yy, {
        fontSize: size,
        color: `rgb(${color[0]},${color[1]},${color[2]})`,
        fontWeight: options?.bold ? "700" : "400",
        maxWidthPt: maxWidth,
        locale,
        align: options?.align,
      });
    }
    doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(value, maxWidth) as string[];
    const align = options?.align ?? "left";
    doc.text(lines, x, yy + size * 0.85, { align });
    return lines.length * size * 1.25;
  };

  y += text(copy.quotationTitle, margin, y, 18, { bold: true });
  y += 8;

  if (mainImage) {
    const imgH = 190;
    const imgW = contentW;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(margin, y, imgW, imgH, 6, 6, "FD");
    doc.addImage(mainImage, "JPEG", margin + 4, y + 4, imgW - 8, imgH - 8);
    y += imgH + 12;
  }

  y += text(vehicleName, margin, y, 16, { bold: true });
  y += 6;
  y += text(`${copy.stockId}: ${vehicle.id}`, margin, y, 10, { color: SLATE });
  y += 4;
  y += text(`${copy.availability}: ${status}`, margin, y, 10, { color: SLATE });
  y += 10;

  doc.setFillColor(...YELLOW);
  doc.roundedRect(margin, y, contentW, 46, 4, 4, "F");
  text(copy.fobChina, margin + 12, y + 8, 9, { color: NAVY });
  text(price, margin + 12, y + 22, 18, { bold: true, color: NAVY });
  y += 56;

  y += text(`${copy.quoteDate}: ${quoteDate}`, margin, y, 9, { color: SLATE });
  y += 4;
  y += text(`${copy.website}: ${copy.websiteUrl}`, margin, y, 9, {
    color: SLATE,
  });
  y += 4;
  y += text(`WhatsApp: ${whatsappDisplay}`, margin, y, 9, { color: SLATE });
  y += 10;

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 224, 71);
  const noticeH = useBitmap ? 36 : 28;
  doc.roundedRect(margin, y, contentW, noticeH, 3, 3, "FD");
  text(copy.freightNotIncluded, margin + 10, y + 8, 9, {
    color: NAVY,
    maxWidth: contentW - 20,
  });
  y += noticeH + 12;

  // Quotation contact — QR only (no avatars / profile screenshots)
  const contactBoxH = qrDataUrl ? 148 : 72;
  if (y + contactBoxH > pageH - 28) {
    addFooter(doc, copy, whatsappDisplay);
    doc.addPage();
    drawHeaderBar(doc, copy, whatsappDisplay);
    y = 42;
  }

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, contactBoxH, 6, 6, "FD");
  let cy = y + 10;
  cy += text(copy.companyName, margin + 12, cy, 11, { bold: true });
  cy += 2;
  cy += text(copy.quotationContact, margin + 12, cy, 10, { bold: true });
  cy += 4;
  cy += text(
    `${copy.assignedContact}: ${contact.name}`,
    margin + 12,
    cy,
    10,
    { color: SLATE }
  );
  cy += 3;
  cy += text(
    `${copy.whatsappLabel}: ${whatsappDisplay}`,
    margin + 12,
    cy,
    10,
    { color: SLATE }
  );
  cy += 4;
  cy += text(copy.qrCodeLabel, margin + 12, cy, 9, { color: SLATE });

  if (qrDataUrl) {
    const qrSize = 88;
    const qrX = margin + contentW - qrSize - 14;
    const qrY = y + (contactBoxH - qrSize) / 2;
    doc.setFillColor(...WHITE);
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4, 4, "F");
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  }

  y += contactBoxH + 10;

  addFooter(doc, copy, whatsappDisplay);

  doc.addPage();
  drawHeaderBar(doc, copy, whatsappDisplay);
  y = 42;
  y += text(copy.vehicleInformation, margin, y, 14, { bold: true });
  y += 10;

  const rows = buildQuoteSpecRows(vehicle, locale);
  const rowH = 18;
  rows.forEach((row, rowIndex) => {
    if (y > pageH - 50) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }
    doc.setFillColor(...(rowIndex % 2 === 0 ? LIGHT : WHITE));
    doc.rect(margin, y, contentW, rowH, "F");
    text(row.label, margin + 8, y + 3, 9, {
      color: SLATE,
      maxWidth: contentW * 0.4,
    });
    text(row.value, margin + contentW * 0.42, y + 3, 9, {
      bold: true,
      maxWidth: contentW * 0.55,
    });
    y += rowH;
  });

  const description = vehicle.descriptionEn?.trim();
  if (description) {
    y += 14;
    if (y > pageH - 80) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }
    y += text(copy.fieldLabels.description, margin, y, 11, { bold: true });
    y += 6;
    y += text(description, margin, y, 9, {
      color: SLATE,
      maxWidth: contentW,
    });
  }

  const features = (vehicle.features ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (features.length) {
    y += 14;
    if (y > pageH - 60) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }
    y += text(copy.fieldLabels.features, margin, y, 11, { bold: true });
    y += 6;
    for (const line of features) {
      if (y > pageH - 40) {
        addFooter(doc, copy, whatsappDisplay);
        doc.addPage();
        drawHeaderBar(doc, copy, whatsappDisplay);
        y = 42;
      }
      y += text(`• ${line}`, margin, y, 9, {
        color: SLATE,
        maxWidth: contentW,
      });
      y += 2;
    }
  }

  if (extraImages.length > 0) {
    y += 16;
    if (y > pageH - 140) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }
    y += text(copy.vehicleImages, margin, y, 11, { bold: true });
    y += 8;
    const gap = 8;
    const colW = (contentW - gap * 2) / 3;
    const imgH = 90;
    extraImages.forEach((img, i) => {
      const x = margin + i * (colW + gap);
      doc.setFillColor(...LIGHT);
      doc.roundedRect(x, y, colW, imgH, 4, 4, "F");
      doc.addImage(img, "JPEG", x + 3, y + 3, colW - 6, imgH - 6);
    });
    y += imgH + 12;
  }

  if (y > pageH - 120) {
    addFooter(doc, copy, whatsappDisplay);
    doc.addPage();
    drawHeaderBar(doc, copy, whatsappDisplay);
    y = 42;
  }
  y += 8;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 224, 71);
  const discStart = y;
  y += 8;
  y += text(copy.disclaimerTitle, margin + 10, y, 11, { bold: true });
  y += 6;
  for (const para of copy.disclaimerBody) {
    y += text(para, margin + 10, y, 8, {
      color: SLATE,
      maxWidth: contentW - 20,
    });
    y += 6;
  }
  y += 4;
  doc.roundedRect(margin, discStart, contentW, y - discStart, 4, 4, "D");

  addFooter(doc, copy, whatsappDisplay);
  finalizePageNumbers(doc, copy);

  doc.save(buildQuoteFilename(vehicle));
}
