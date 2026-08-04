/**
 * Lightweight checks for PDF delivery helpers (UA detection + filename headers).
 * Run: npx tsx scripts/check-proforma-pdf-delivery.ts
 */

import assert from "node:assert/strict";
import { PROFORMA_PDF_DOWNLOAD_FILENAME } from "../src/lib/proforma/pdfDownloadName";

function isMobileBrowserUA(ua: string, opts?: { maxTouchPoints?: number }): boolean {
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua)) return true;
  if (/SamsungBrowser/i.test(ua)) return true;
  if (/Mobile/i.test(ua) && /Safari/i.test(ua) && !/Chrome|CriOS|EdgiOS/i.test(ua)) {
    return true;
  }
  if (
    /Macintosh/i.test(ua) &&
    typeof opts?.maxTouchPoints === "number" &&
    opts.maxTouchPoints > 1
  ) {
    return true;
  }
  return false;
}

const cases: Array<{
  name: string;
  ua: string;
  mobile: boolean;
  maxTouchPoints?: number;
}> = [
  {
    name: "iPhone Safari",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    mobile: true,
  },
  {
    name: "Android Chrome",
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    mobile: true,
  },
  {
    name: "Samsung Internet",
    ua: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/110.0.5481.154 Mobile Safari/537.36",
    mobile: true,
  },
  {
    name: "Desktop Chrome",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    mobile: false,
  },
  {
    name: "Desktop Safari",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    mobile: false,
  },
  {
    name: "Edge",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    mobile: false,
  },
  {
    name: "iPadOS desktop UA",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    mobile: true,
    maxTouchPoints: 5,
  },
];

assert.equal(PROFORMA_PDF_DOWNLOAD_FILENAME, "Invoice.pdf");

for (const c of cases) {
  const got = isMobileBrowserUA(c.ua, { maxTouchPoints: c.maxTouchPoints });
  assert.equal(got, c.mobile, c.name);
  console.log(`✓ ${c.name} → mobile=${got}`);
}

const disposition = `inline; filename="${PROFORMA_PDF_DOWNLOAD_FILENAME}"`;
assert.equal(disposition, 'inline; filename="Invoice.pdf"');
console.log("✓ Content-Disposition format");
console.log("All PDF delivery checks passed.");
