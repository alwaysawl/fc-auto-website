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
  calculateContainedImageFit,
  calculateImageFit,
} from "@/lib/vehicleQuote/imageFit";
import {
  loadPngAsDataUrl,
  loadQuoteImages,
  renderTextBitmap,
  type QuoteImageAsset,
} from "@/lib/vehicleQuote/images";

const NAVY: [number, number, number] = [26, 35, 50];
const YELLOW: [number, number, number] = [245, 198, 54];
const WHITE: [number, number, number] = [255, 255, 255];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [248, 250, 252];
const FRAME_FILL: [number, number, number] = [250, 250, 250];

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
  doc.text(copy.website, w / 2, h - 6, { align: "center" });
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

/** Draw main vehicle image with contain (no stretch, no crop). */
function drawContainedImage(
  doc: Pdf,
  asset: QuoteImageAsset,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(...FRAME_FILL);
  doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, "FD");

  const pad = 4;
  const innerX = boxX + pad;
  const innerY = boxY + pad;
  const innerW = boxW - pad * 2;
  const innerH = boxH - pad * 2;

  const fit = calculateContainedImageFit(
    asset.width,
    asset.height,
    innerX,
    innerY,
    innerW,
    innerH
  );

  doc.addImage(
    asset.dataUrl,
    "JPEG",
    fit.x,
    fit.y,
    fit.width,
    fit.height
  );
}

/**
 * Draw thumbnail with cover + clip when possible.
 * Falls back to contain if clipping is unavailable.
 */
function drawCoverThumbnail(
  doc: Pdf,
  asset: QuoteImageAsset,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(...FRAME_FILL);
  doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, "FD");

  const pad = 2;
  const innerX = boxX + pad;
  const innerY = boxY + pad;
  const innerW = boxW - pad * 2;
  const innerH = boxH - pad * 2;

  const cover = calculateImageFit(
    asset.width,
    asset.height,
    innerX,
    innerY,
    innerW,
    innerH,
    "cover"
  );

  try {
    doc.saveGraphicsState();
    doc.rect(innerX, innerY, innerW, innerH);
    doc.clip();
    // discardPath exists on jsPDF for clipping workflows
    (doc as Pdf & { discardPath?: () => void }).discardPath?.();
    doc.addImage(
      asset.dataUrl,
      "JPEG",
      cover.x,
      cover.y,
      cover.width,
      cover.height
    );
    doc.restoreGraphicsState();
  } catch {
    const contain = calculateImageFit(
      asset.width,
      asset.height,
      innerX,
      innerY,
      innerW,
      innerH,
      "contain"
    );
    doc.addImage(
      asset.dataUrl,
      "JPEG",
      contain.x,
      contain.y,
      contain.width,
      contain.height
    );
  }
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
  const footerSafe = 28;

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
    const frameH = 188;
    drawContainedImage(doc, mainImage, margin, y, contentW, frameH);
    y += frameH + 10;
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
  y += 52;

  y += text(`${copy.quoteDate}: ${quoteDate}`, margin, y, 9, { color: SLATE });
  y += 4;
  // Clean website display — no duplicated "fcautoexport.com: https://..."
  y += text(copy.website, margin, y, 9, { color: SLATE });
  y += 8;

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 224, 71);
  const noticeH = useBitmap ? 34 : 26;
  doc.roundedRect(margin, y, contentW, noticeH, 3, 3, "FD");
  text(copy.freightNotIncluded, margin + 10, y + 7, 9, {
    color: NAVY,
    maxWidth: contentW - 20,
  });
  y += noticeH + 10;

  // —— Unified contact + QR card ——
  const qrSize = 78;
  const qrQuiet = 8;
  const qrBlockW = qrSize + qrQuiet * 2;
  const hintMaxW = qrBlockW + 20;
  const hintH = useBitmap ? 28 : 18;
  const contactCardH = Math.max(108, qrQuiet * 2 + qrSize + 6 + hintH + 8);

  if (y + contactCardH > pageH - footerSafe) {
    addFooter(doc, copy, whatsappDisplay);
    doc.addPage();
    drawHeaderBar(doc, copy, whatsappDisplay);
    y = 42;
  }

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, contactCardH, 6, 6, "FD");

  const dividerX = margin + contentW - qrBlockW - 28;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(dividerX, y + 12, dividerX, y + contactCardH - 12);

  const leftMaxW = dividerX - margin - 24;
  let cy = y + 14;
  cy += text(copy.companyName, margin + 14, cy, 11, {
    bold: true,
    maxWidth: leftMaxW,
  });
  cy += 3;
  cy += text(copy.quotationContact, margin + 14, cy, 10, {
    bold: true,
    maxWidth: leftMaxW,
  });
  cy += 8;
  cy += text(
    `${copy.assignedContact}: ${contact.name}`,
    margin + 14,
    cy,
    10,
    { color: SLATE, maxWidth: leftMaxW }
  );
  cy += 4;
  cy += text(
    `${copy.whatsappLabel}: ${whatsappDisplay}`,
    margin + 14,
    cy,
    10,
    { color: SLATE, maxWidth: leftMaxW }
  );

  if (qrDataUrl) {
    const qrX = margin + contentW - qrBlockW - 14 + qrQuiet;
    const qrY = y + 12;
    doc.setFillColor(...WHITE);
    doc.roundedRect(
      qrX - qrQuiet,
      qrY - 4,
      qrSize + qrQuiet * 2,
      qrSize + 8,
      4,
      4,
      "F"
    );
    // QR is square — never stretch
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    const hintY = qrY + qrSize + 8;
    text(copy.scanQrHint, qrX + qrSize / 2, hintY, 7, {
      color: SLATE,
      maxWidth: hintMaxW,
      align: "center",
    });
  }

  y += contactCardH + 8;

  addFooter(doc, copy, whatsappDisplay);

  // —— Page 2: specs + thumbnails + disclaimer ——
  doc.addPage();
  drawHeaderBar(doc, copy, whatsappDisplay);
  y = 42;
  y += text(copy.vehicleInformation, margin, y, 14, { bold: true });
  y += 10;

  const rows = buildQuoteSpecRows(vehicle, locale);
  const rowH = 18;
  rows.forEach((row, rowIndex) => {
    if (y > pageH - footerSafe - 20) {
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
    if (y > pageH - footerSafe - 60) {
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
    if (y > pageH - footerSafe - 40) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }
    y += text(copy.fieldLabels.features, margin, y, 11, { bold: true });
    y += 6;
    for (const line of features) {
      if (y > pageH - footerSafe - 20) {
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
    y += 14;
    if (y > pageH - footerSafe - 120) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }
    y += text(copy.vehicleImages, margin, y, 11, { bold: true });
    y += 8;
    const gap = 10;
    const colW = (contentW - gap * 2) / 3;
    const thumbH = 92;
    extraImages.forEach((asset, i) => {
      const x = margin + i * (colW + gap);
      try {
        drawCoverThumbnail(doc, asset, x, y, colW, thumbH);
      } catch {
        // Skip failed thumbnail without aborting the PDF
      }
    });
    y += thumbH + 12;
  }

  if (y > pageH - footerSafe - 100) {
    addFooter(doc, copy, whatsappDisplay);
    doc.addPage();
    drawHeaderBar(doc, copy, whatsappDisplay);
    y = 42;
  }
  y += 6;
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
