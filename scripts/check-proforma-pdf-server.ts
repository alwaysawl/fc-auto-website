/**
 * Smoke-test server-side jsPDF + Noto font embedding.
 * Run: npx tsx scripts/check-proforma-pdf-server.ts
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { jsPDF } from "jspdf";

async function main() {
  const regular = await readFile(
    join(process.cwd(), "public/fonts/NotoSansSC-Regular.ttf")
  );
  const bold = await readFile(
    join(process.cwd(), "public/fonts/NotoSansSC-Bold.ttf")
  );

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.addFileToVFS("NotoSansSC-Regular.ttf", regular.toString("base64"));
  doc.addFileToVFS("NotoSansSC-Bold.ttf", bold.toString("base64"));
  doc.addFont("NotoSansSC-Regular.ttf", "NotoSansSC", "normal");
  doc.addFont("NotoSansSC-Bold.ttf", "NotoSansSC", "bold");
  doc.setFont("NotoSansSC", "normal");
  doc.setFontSize(12);
  doc.text("形式发票 / Proforma Invoice", 40, 40);

  const bytes = new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
  const header = String.fromCharCode(...bytes.slice(0, 5));
  assert.equal(header, "%PDF-");
  assert.ok(bytes.byteLength > 1000);
  console.log(`✓ server jsPDF + font embed OK (${bytes.byteLength} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
