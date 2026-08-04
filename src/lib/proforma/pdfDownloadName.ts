/** Build a stable, ASCII-safe Proforma PDF download filename. */
export function buildProformaDownloadFilename(invoiceNumber: string): string {
  const safe = (invoiceNumber || "PI")
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `FC-Auto-Proforma-Invoice-${safe || "PI"}.pdf`;
}

/** @deprecated Prefer buildProformaDownloadFilename(invoiceNumber) */
export const PROFORMA_PDF_DOWNLOAD_FILENAME = "FC-Auto-Proforma-Invoice.pdf";
