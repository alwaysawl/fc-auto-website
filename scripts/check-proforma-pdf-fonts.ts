/**
 * Verify Proforma font path resolution (same logic as production).
 * Run: npx tsx scripts/check-proforma-pdf-fonts.ts
 */

import assert from "node:assert/strict";
import {
  PROFORMA_FONT_FILES,
  resolveProformaFontPath,
} from "../src/lib/proforma/pdfFonts";

for (const filename of Object.values(PROFORMA_FONT_FILES)) {
  const resolved = resolveProformaFontPath(filename);
  console.log("[check]", {
    cwd: resolved.cwd,
    filename,
    resolvedPath: resolved.path,
    exists: resolved.exists,
  });
  assert.equal(resolved.exists, true, `missing ${filename}`);
  assert.ok(
    resolved.path.endsWith(`public/fonts/${filename}`) ||
      resolved.path.endsWith(`public\\fonts\\${filename}`),
    `unexpected path ${resolved.path}`
  );
}

console.log("✓ Proforma font files resolve from project root");
