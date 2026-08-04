/**
 * Delivery strategy checks for Share vs anchor vs iOS fallback.
 * Run: npx tsx scripts/check-proforma-pdf-delivery-flow.ts
 */

import assert from "node:assert/strict";
import { buildProformaDownloadFilename } from "../src/lib/proforma/pdfDownloadName";

function isAppleMobile(ua: string, maxTouchPoints = 0): boolean {
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return true;
  return false;
}

function plan(platform: string, ua: string, maxTouchPoints = 0) {
  const apple = isAppleMobile(ua, maxTouchPoints);
  return {
    platform,
    apple,
    downloadUsesWindowOpen: false,
    downloadUsesLocationHref: false,
    primary: apple ? "navigator.share({files})" : "<a download> blob",
    fallback: apple ? "blob tab + 存储到文件 instruction" : null,
  };
}

const cases = [
  plan(
    "iPhone Safari",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
  ),
  plan(
    "iPhone Chrome",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0.0.0 Mobile/15E148 Safari/604.1"
  ),
  plan(
    "Android Chrome",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
  ),
  plan(
    "Desktop Chrome",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
  ),
  plan(
    "Mac Safari",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"
  ),
];

for (const c of cases) {
  assert.equal(c.downloadUsesWindowOpen, false);
  assert.equal(c.downloadUsesLocationHref, false);
  if (c.platform.startsWith("iPhone")) {
    assert.equal(c.apple, true);
    assert.equal(c.primary, "navigator.share({files})");
  } else {
    assert.equal(c.apple, false);
    assert.equal(c.primary, "<a download> blob");
  }
  console.log(`✓ ${c.platform}: ${c.primary}`);
}

const name = buildProformaDownloadFilename("PI-2026-001");
assert.equal(name, "FC-Auto-Proforma-Invoice-PI-2026-001.pdf");
console.log("✓ filename", name);
console.log("All delivery plans OK.");
