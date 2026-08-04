import { jsPDF } from "jspdf";
import type { Locale, Vehicle } from "@/lib/types";
import { getVehicleQuoteCopy } from "@/lib/vehicleQuote/copy";
import { resolveQuoteContact } from "@/lib/vehicleQuote/contacts";
import {
  buildQuoteFilename,
  buildQuoteSpecRows,
  collectQuoteImageUrls,
  formatQuoteDate,
  formatQuotePrice,
  statusLabelForQuote,
} from "@/lib/vehicleQuote/helpers";
import { calculateImageFit } from "@/lib/vehicleQuote/imageFit";
import {
  loadPngAsDataUrl,
  loadQuoteImages,
  renderCoverCroppedAsset,
  renderTextBitmap,
  type QuoteImageAsset,
} from "@/lib/vehicleQuote/images";
import {
  isAppleMobileBrowser,
  shareOrSavePdfFile,
} from "@/lib/pdf/deliverPdfBlob";

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

/**
 * Cover-fit image into a frame via canvas crop (uses calculateImageFit logic),
 * then draw at frame size — never stretches the original proportions.
 */
async function drawCoverImage(
  doc: Pdf,
  asset: QuoteImageAsset,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  radius = 6
): Promise<void> {
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(...FRAME_FILL);
  doc.roundedRect(boxX, boxY, boxW, boxH, radius, radius, "FD");

  const pad = 2;
  const innerX = boxX + pad;
  const innerY = boxY + pad;
  const innerW = boxW - pad * 2;
  const innerH = boxH - pad * 2;

  // ~2px per pt for sharp PDF output
  const pxW = Math.max(40, Math.round(innerW * 2));
  const pxH = Math.max(40, Math.round(innerH * 2));

  const cropped = await renderCoverCroppedAsset(asset, pxW, pxH);
  if (cropped) {
    doc.addImage(
      cropped.dataUrl,
      "JPEG",
      innerX,
      innerY,
      innerW,
      innerH
    );
    return;
  }

  // Fallback: cover via fit + clip (or contain)
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
 * Build a vehicle quotation PDF File in memory (no navigation / share).
 */
export async function buildVehicleQuotePdfFile(
  vehicle: Vehicle,
  locale: Locale,
  options?: { contactName?: string | null }
): Promise<{ file: File; contactName: string }> {
  const result = await buildVehicleQuotePdfInternal(vehicle, locale, options);
  return result;
}

/**
 * Generate and deliver a vehicle quotation PDF.
 * On Apple mobile, returns the File with deliveryMethod "ready" so the UI can
 * call share from a second direct tap (user activation).
 */
export async function downloadVehicleQuotePdf(
  vehicle: Vehicle,
  locale: Locale,
  options?: { contactName?: string | null }
): Promise<{
  contactName: string;
  filename: string;
  file: File;
  deliveryMethod: "share" | "download" | "ready";
  deliveryMessage?: string;
}> {
  const { file, contactName } = await buildVehicleQuotePdfFile(
    vehicle,
    locale,
    options
  );

  if (isAppleMobileBrowser()) {
    return {
      contactName,
      filename: file.name,
      file,
      deliveryMethod: "ready",
      deliveryMessage: "PDF 已生成，请再次点击下载以保存到手机",
    };
  }

  const delivery = await shareOrSavePdfFile(file);
  return {
    contactName,
    filename: file.name,
    file,
    deliveryMethod: delivery.method,
  };
}

async function buildVehicleQuotePdfInternal(
  vehicle: Vehicle,
  locale: Locale,
  options?: { contactName?: string | null }
): Promise<{ file: File; contactName: string }> {
  const copy = getVehicleQuoteCopy(locale);
  const contact = await resolveQuoteContact(options?.contactName);
  const whatsappDisplay = contact.whatsappDisplay;
  const useBitmap = locale === "zh";
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentW = pageW - margin * 2;
  const footerSafe = 28;

  const imageUrls = collectQuoteImageUrls(vehicle);
  // Up to 6 images: page-1 hero uses the first; page-2 grid shows all (3×2).
  const images = await loadQuoteImages(imageUrls, 6);
  const mainImage = images[0] ?? null;
  const gridImages = images.slice(0, 6);
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

  y += text(copy.quotationTitle, margin, y, 16, { bold: true });
  y += 8;

  // —— Page 1 hero: ~55% image left / info right ——
  const gap = 14;
  // ~12% larger image frame vs prior 0.55×210 while keeping cover aspect fitting
  const leftW = contentW * 0.58;
  const rightW = contentW - leftW - gap;
  const leftX = margin;
  const rightX = margin + leftW + gap;
  const heroH = 236;
  const heroTop = y;

  if (mainImage) {
    await drawCoverImage(doc, mainImage, leftX, heroTop, leftW, heroH, 6);
  } else {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(...FRAME_FILL);
    doc.roundedRect(leftX, heroTop, leftW, heroH, 6, 6, "FD");
  }

  let ry = heroTop + 4;
  ry += text(vehicleName, rightX, ry, 13, {
    bold: true,
    maxWidth: rightW,
  });
  ry += 6;
  ry += text(`${copy.stockId}: ${vehicle.id}`, rightX, ry, 9, {
    color: SLATE,
    maxWidth: rightW,
  });
  ry += 4;
  ry += text(`${copy.availability}: ${status}`, rightX, ry, 9, {
    color: SLATE,
    maxWidth: rightW,
  });
  ry += 8;

  const priceBoxH = 48;
  doc.setFillColor(...YELLOW);
  doc.roundedRect(rightX, ry, rightW, priceBoxH, 4, 4, "F");
  text(copy.fobChina, rightX + 10, ry + 8, 8, {
    color: NAVY,
    maxWidth: rightW - 20,
  });
  text(price, rightX + 10, ry + 22, 15, {
    bold: true,
    color: NAVY,
    maxWidth: rightW - 20,
  });
  ry += priceBoxH + 8;

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 224, 71);
  const noticeH = useBitmap ? 40 : 32;
  const noticeBottom = Math.min(ry + noticeH, heroTop + heroH);
  const noticeBoxH = Math.max(26, noticeBottom - ry);
  doc.roundedRect(rightX, ry, rightW, noticeBoxH, 3, 3, "FD");
  text(copy.freightNotIncluded, rightX + 8, ry + 6, 8, {
    color: NAVY,
    maxWidth: rightW - 16,
  });

  // Date + website under the hero row (compact, no duplicate WhatsApp)
  y = heroTop + heroH + 10;
  y += text(`${copy.quoteDate}: ${quoteDate}`, margin, y, 9, { color: SLATE });
  y += 3;
  y += text(copy.website, margin, y, 9, { color: SLATE });
  y += 8;

  // —— Unified contact + QR card ——
  const qrSize = 76;
  const qrQuiet = 10;
  const qrColW = qrSize + qrQuiet * 2 + 8;
  const scanHints = [
    { line: "Scan to contact us on WhatsApp", forceBitmap: false },
    { line: "扫描二维码，通过 WhatsApp 联系我们", forceBitmap: true },
    { line: "Scannez pour nous contacter sur WhatsApp", forceBitmap: false },
  ] as const;
  const scanLineH = 11;
  const scanBlockH = scanHints.length * scanLineH + 4;
  const qrSectionH = qrSize + 8 + scanBlockH;
  const contactCardH = Math.max(118, qrSectionH + 20);

  if (y + contactCardH > pageH - footerSafe) {
    addFooter(doc, copy, whatsappDisplay);
    doc.addPage();
    drawHeaderBar(doc, copy, whatsappDisplay);
    y = 42;
  }

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, contactCardH, 6, 6, "FD");

  const dividerX = margin + contentW - qrColW - 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(dividerX, y + 10, dividerX, y + contactCardH - 10);

  const leftMaxW = dividerX - margin - 22;
  let cy = y + 14;
  cy += text(copy.companyName, margin + 14, cy, 12, {
    bold: true,
    maxWidth: leftMaxW,
  });
  cy += 4;
  cy += text(copy.quotationContact, margin + 14, cy, 10, {
    bold: true,
    maxWidth: leftMaxW,
  });
  cy += 10;
  cy += text(`${copy.assignedContact}:`, margin + 14, cy, 9, {
    color: SLATE,
    maxWidth: leftMaxW,
  });
  cy += 2;
  cy += text(contact.name, margin + 14, cy, 11, {
    bold: true,
    maxWidth: leftMaxW,
  });
  cy += 8;
  cy += text(`${copy.whatsappLabel}:`, margin + 14, cy, 9, {
    color: SLATE,
    maxWidth: leftMaxW,
  });
  cy += 2;
  cy += text(whatsappDisplay, margin + 14, cy, 11, {
    bold: true,
    maxWidth: leftMaxW,
  });

  // Right: vertically centered QR + trilingual scan hints
  const rightColW = margin + contentW - dividerX;
  const qrColCenterX = dividerX + rightColW / 2;
  const qrSectionTop = y + (contactCardH - qrSectionH) / 2;
  if (qrDataUrl) {
    const qrX = qrColCenterX - qrSize / 2;
    const qrY = qrSectionTop;
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
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    let hintY = qrY + qrSize + 8;
    for (const hint of scanHints) {
      if (hint.forceBitmap || useBitmap) {
        putBitmap(doc, hint.line, qrColCenterX, hintY, {
          fontSize: 6.5,
          color: `rgb(${SLATE[0]},${SLATE[1]},${SLATE[2]})`,
          maxWidthPt: qrColW + 24,
          locale: hint.forceBitmap ? "zh" : locale,
          align: "center",
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...SLATE);
        doc.text(hint.line, qrColCenterX, hintY + 6, { align: "center" });
      }
      hintY += scanLineH;
    }
  }

  // Compact spacing above footer — no large empty band
  y += contactCardH + 6;
  addFooter(doc, copy, whatsappDisplay);

  // —— Page 2 ——
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

  if (gridImages.length > 0) {
    y += 12;
    const thumbGap = 8;
    const colW = (contentW - thumbGap * 2) / 3;
    const thumbH = 102;
    const rows = Math.ceil(gridImages.length / 3);
    const gridBlockH =
      20 /* title */ + rows * thumbH + Math.max(0, rows - 1) * thumbGap;

    // Measure notice content height (auto — never stretch to fill the page).
    const discPadTop = 12;
    const discPadBottom = 12;
    const discLineGap = 6;
    let discContentH = 14; // title
    for (const para of copy.disclaimerBody) {
      if (useBitmap) {
        const bmp = renderTextBitmap(para, {
          fontSize: 16,
          maxWidth: (contentW - 28) * 2,
          locale: "zh",
        });
        discContentH += bmp.height / 2 + discLineGap;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(para, contentW - 28) as string[];
        discContentH += lines.length * 8 * 1.25 + discLineGap;
      }
    }
    const discBoxH = discContentH + discPadTop + discPadBottom;
    const blockNeed = gridBlockH + 10 + discBoxH + 8;

    // Keep image grid + notice together on one page when possible.
    if (y + blockNeed > pageH - footerSafe) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }

    y += text(copy.vehicleImages, margin, y, 11, { bold: true });
    y += 8;
    const gridTop = y;
    for (let i = 0; i < gridImages.length; i++) {
      const asset = gridImages[i];
      if (!asset) continue;
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = margin + col * (colW + thumbGap);
      const iy = gridTop + row * (thumbH + thumbGap);
      try {
        await drawCoverImage(doc, asset, x, iy, colW, thumbH, 4);
      } catch {
        // skip failed thumbnail
      }
    }
    y = gridTop + rows * thumbH + Math.max(0, rows - 1) * thumbGap + 10;

    // Quotation Notice — height from content only (no page-filling stretch).
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 224, 71);
    const discStart = y;
    doc.roundedRect(margin, discStart, contentW, discBoxH, 4, 4, "FD");
    let dy = discStart + discPadTop;
    dy += text(copy.disclaimerTitle, margin + 14, dy, 11, { bold: true });
    dy += 6;
    for (const para of copy.disclaimerBody) {
      dy += text(para, margin + 14, dy, 8, {
        color: SLATE,
        maxWidth: contentW - 28,
      });
      dy += discLineGap;
    }
    y = discStart + discBoxH + 6;
  } else {
    // No images — still show notice with auto height.
    if (y > pageH - footerSafe - 100) {
      addFooter(doc, copy, whatsappDisplay);
      doc.addPage();
      drawHeaderBar(doc, copy, whatsappDisplay);
      y = 42;
    }
    const discPadTop = 12;
    const discPadBottom = 12;
    const discLineGap = 6;
    let discContentH = 14;
    for (const para of copy.disclaimerBody) {
      if (useBitmap) {
        const bmp = renderTextBitmap(para, {
          fontSize: 16,
          maxWidth: (contentW - 28) * 2,
          locale: "zh",
        });
        discContentH += bmp.height / 2 + discLineGap;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(para, contentW - 28) as string[];
        discContentH += lines.length * 8 * 1.25 + discLineGap;
      }
    }
    const discBoxH = discContentH + discPadTop + discPadBottom;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 224, 71);
    const discStart = y + 6;
    doc.roundedRect(margin, discStart, contentW, discBoxH, 4, 4, "FD");
    let dy = discStart + discPadTop;
    dy += text(copy.disclaimerTitle, margin + 14, dy, 11, { bold: true });
    dy += 6;
    for (const para of copy.disclaimerBody) {
      dy += text(para, margin + 14, dy, 8, {
        color: SLATE,
        maxWidth: contentW - 28,
      });
      dy += discLineGap;
    }
  }

  addFooter(doc, copy, whatsappDisplay);
  finalizePageNumbers(doc, copy);

  const filename = buildQuoteFilename(vehicle);
  const blob = doc.output("blob") as Blob;
  const pdfBlob =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  const file = new File([pdfBlob], filename, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
  return { file, contactName: contact.name };
}
