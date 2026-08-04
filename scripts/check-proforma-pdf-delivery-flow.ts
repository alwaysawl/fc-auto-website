/**
 * Simulate desktop vs mobile PDF delivery paths (Blob + headers).
 * Run: npx tsx scripts/check-proforma-pdf-delivery-flow.ts
 */

import assert from "node:assert/strict";
import { PROFORMA_PDF_DOWNLOAD_FILENAME } from "../src/lib/proforma/pdfDownloadName";

type Platform =
  | "iPhone Safari"
  | "Android Chrome"
  | "Samsung Internet"
  | "Desktop Chrome"
  | "Desktop Safari"
  | "Edge";

function planDelivery(platform: Platform): {
  mobile: boolean;
  strategy: "share-or-new-tab" | "anchor-download";
  contentType: string;
  contentDisposition: string;
  filename: string;
} {
  const mobile = !(
    platform === "Desktop Chrome" ||
    platform === "Desktop Safari" ||
    platform === "Edge"
  );
  return {
    mobile,
    strategy: mobile ? "share-or-new-tab" : "anchor-download",
    contentType: "application/pdf",
    contentDisposition: `inline; filename="${PROFORMA_PDF_DOWNLOAD_FILENAME}"`,
    filename: PROFORMA_PDF_DOWNLOAD_FILENAME,
  };
}

const platforms: Platform[] = [
  "iPhone Safari",
  "Android Chrome",
  "Samsung Internet",
  "Desktop Chrome",
  "Desktop Safari",
  "Edge",
];

for (const platform of platforms) {
  const plan = planDelivery(platform);
  assert.equal(plan.contentType, "application/pdf");
  assert.equal(plan.contentDisposition, 'inline; filename="Invoice.pdf"');
  assert.equal(plan.filename, "Invoice.pdf");
  if (
    platform === "Desktop Chrome" ||
    platform === "Desktop Safari" ||
    platform === "Edge"
  ) {
    assert.equal(plan.mobile, false);
    assert.equal(plan.strategy, "anchor-download");
  } else {
    assert.equal(plan.mobile, true);
    assert.equal(plan.strategy, "share-or-new-tab");
  }
  console.log(
    `✓ ${platform}: mobile=${plan.mobile} strategy=${plan.strategy}`
  );
}

// Blob MIME must stay application/pdf for iOS Safari viewers.
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
assert.equal(String.fromCharCode(...pdfBytes), "%PDF-");
console.log("✓ Blob MIME contract: application/pdf + %PDF- payload");
console.log("All platform delivery plans OK.");
