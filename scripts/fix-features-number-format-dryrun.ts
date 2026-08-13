/**
 * Dry-run: fix digit formatting in features_fr / features_zh to match English features.
 * No DB writes.
 *
 * FR: 6,41 → 6.41 ; 4 770 → 4770 (and nbsp/thin-space variants)
 * ZH scheme B: restore English fragments inline-4 / 4WD / 4th-Gen
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type VehicleRow = {
  id: string;
  features: string | null;
  features_fr: string | null;
  features_zh: string | null;
};

function loadEnvLocal() {
  try {
    const txt = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const idx = t.indexOf("=");
      if (idx <= 0) continue;
      const key = t.slice(0, idx).trim();
      let value = t.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractEnNumbers(text: string): string[] {
  const out: string[] = [];
  const re = /\d+(?:\.\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** Optional spaces (incl. nbsp/thin) between digits for thousand grouping. */
function spacedIntegerPattern(intPart: string): string {
  return intPart
    .split("")
    .map((d, i) =>
      i === 0
        ? escapeReg(d)
        : `(?:[\\s\\u00A0\\u202F\\u2009\\u2007]*${escapeReg(d)})`
    )
    .join("");
}

/**
 * Normalize FR/ZH number spellings to exact EN forms (non-sequential, safe replaces).
 * Longer numbers first to avoid partial overlaps.
 */
function normalizeNumberSpellings(
  en: string,
  target: string
): { text: string; changeCount: number; samples: Array<{ from: string; to: string }> } {
  let text = target;
  let changeCount = 0;
  const samples: Array<{ from: string; to: string }> = [];

  const nums = uniquePreserveOrder(extractEnNumbers(en)).sort(
    (a, b) => b.length - a.length
  );

  for (const enNum of nums) {
    if (enNum.includes(".")) {
      const [i, f] = enNum.split(".");
      // Only replace comma-decimal form of this exact value
      const re = new RegExp(`(?<!\\d)${escapeReg(i)},${escapeReg(f)}(?!\\d)`, "g");
      text = text.replace(re, (matched) => {
        if (matched === enNum) return matched;
        changeCount += 1;
        if (samples.length < 8) samples.push({ from: matched, to: enNum });
        return enNum;
      });
    } else if (enNum.length >= 4) {
      // Replace spaced grouping variants, but not if already exact contiguous
      const re = new RegExp(`(?<!\\d)${spacedIntegerPattern(enNum)}(?!\\d)`, "g");
      text = text.replace(re, (matched) => {
        // If matched already equals enNum (no spaces), no change
        const compact = matched.replace(/[\s\u00A0\u202F\u2009\u2007]/g, "");
        if (matched === enNum) return matched;
        if (compact !== enNum) return matched; // safety
        changeCount += 1;
        if (samples.length < 8) samples.push({ from: matched, to: enNum });
        return enNum;
      });
    }
  }

  return { text, changeCount, samples };
}

function extractEnFragment(en: string, re: RegExp, fallback: string): string {
  const m = en.match(re);
  return m ? m[0] : fallback;
}

/** Scheme B: restore English digit-bound fragments in Chinese. */
function restoreZhEnglishFragments(
  en: string,
  zh: string
): { text: string; changeCount: number; samples: Array<{ from: string; to: string }> } {
  let text = zh;
  let changeCount = 0;
  const samples: Array<{ from: string; to: string }> = [];

  const replacements: Array<{ zhRe: RegExp; to: string }> = [];

  if (/\binline-4\b/i.test(en)) {
    replacements.push({
      zhRe: /直列四缸/g,
      to: extractEnFragment(en, /\binline-4\b/i, "inline-4"),
    });
  }
  if (/\b4WD\b/.test(en)) {
    // Prefer full English phrase when present
    const onDemand = extractEnFragment(
      en,
      /On[-\s]?demand\s+4WD/i,
      ""
    );
    if (onDemand) {
      replacements.push({ zhRe: /按需四轮驱动/g, to: onDemand });
    }
    replacements.push({
      zhRe: /适时四轮驱动|四轮驱动/g,
      to: "4WD",
    });
  }
  if (/4th[-\u2011\u2010\s]?Gen/i.test(en)) {
    replacements.push({
      zhRe: /第四代/g,
      to: extractEnFragment(en, /4th[-\u2011\u2010\s]?Gen/i, "4th-Gen"),
    });
  }

  for (const r of replacements) {
    text = text.replace(r.zhRe, (matched) => {
      if (matched === r.to) return matched;
      changeCount += 1;
      if (samples.length < 8) samples.push({ from: matched, to: r.to });
      return r.to;
    });
  }

  return { text, changeCount, samples };
}

function numberSequence(text: string): string {
  return extractEnNumbers(text).join("|");
}

/**
 * After fixes, every EN number must appear in target with exact spelling.
 * (Order may differ if translator reordered clauses — we only require multiset containment
 * of exact EN spellings.)
 */
function validateExactEnNumbersPresent(en: string, target: string): string | null {
  const enNums = extractEnNumbers(en);
  const counts = new Map<string, number>();
  for (const n of enNums) counts.set(n, (counts.get(n) || 0) + 1);

  // Count exact matches of each EN spelling in target
  for (const [n, need] of counts) {
    const re = new RegExp(`(?<!\\d)${escapeReg(n)}(?!\\d)`, "g");
    const found = target.match(re)?.length ?? 0;
    if (found < need) {
      return `missing exact EN number "${n}" (need ${need}, found ${found})`;
    }
  }
  return null;
}

async function main() {
  loadEnvLocal();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, features, features_fr, features_zh")
    .eq("status", "在售")
    .order("id");
  if (error) throw new Error(error.message);
  const rows = (data || []) as VehicleRow[];

  const frVehicleIds = new Set<string>();
  const zhVehicleIds = new Set<string>();
  let frChanges = 0;
  let zhChanges = 0;
  const failures: Array<{ id: string; reason: string }> = [];
  const examples: Array<{ id: string; locale: "fr" | "zh"; before: string; after: string }> =
    [];

  for (const row of rows) {
    const en = row.features || "";
    const fr = row.features_fr || "";
    const zh = row.features_zh || "";
    if (!en.trim()) continue;

    // --- FR ---
    const frFix = normalizeNumberSpellings(en, fr);
    let nextFr = frFix.text;
    const frValidate = validateExactEnNumbersPresent(en, nextFr);
    if (frValidate) {
      // Still may be OK if FR never had the number due to translation omission of a digit
      // that was semantic (rare). Record failure only if we changed something OR still has
      // comma/space localized forms of EN numbers.
      const stillLocalized =
        /,\d/.test(nextFr) &&
        uniquePreserveOrder(extractEnNumbers(en)).some((n) => {
          if (!n.includes(".")) return false;
          const [i, f] = n.split(".");
          return nextFr.includes(`${i},${f}`);
        });
      if (stillLocalized || frFix.changeCount > 0) {
        failures.push({ id: row.id, reason: `FR: ${frValidate}` });
      }
    }
    if (nextFr !== fr && !failures.some((f) => f.id === row.id && f.reason.startsWith("FR:"))) {
      frVehicleIds.add(row.id);
      frChanges += Math.max(frFix.changeCount, 1);
      if (examples.filter((e) => e.locale === "fr").length < 4) {
        const b = fr.split(/\r?\n/);
        const a = nextFr.split(/\r?\n/);
        for (let i = 0; i < Math.max(b.length, a.length); i++) {
          if ((b[i] || "") !== (a[i] || "")) {
            examples.push({ id: row.id, locale: "fr", before: b[i] || "", after: a[i] || "" });
            break;
          }
        }
      }
    } else if (frFix.changeCount > 0 && nextFr !== fr) {
      frVehicleIds.add(row.id);
      frChanges += frFix.changeCount;
    }

    // Reset failure gate for ZH independently — FR failure shouldn't block ZH dry-run count
    const frFailed = failures.some((f) => f.id === row.id && f.reason.startsWith("FR:"));
    if (!frFailed && nextFr !== fr) {
      // already counted
    } else if (!frFailed && frFix.changeCount > 0) {
      frVehicleIds.add(row.id);
      frChanges += frFix.changeCount;
    }

    // Recompute FR success path cleanly:
  }

  // Cleaner second loop for accurate stats
  frVehicleIds.clear();
  zhVehicleIds.clear();
  frChanges = 0;
  zhChanges = 0;
  failures.length = 0;
  examples.length = 0;

  for (const row of rows) {
    const en = row.features || "";
    const fr = row.features_fr || "";
    const zh = row.features_zh || "";
    if (!en.trim()) continue;

    // FR
    const frFix = normalizeNumberSpellings(en, fr);
    const nextFr = frFix.text;
    if (nextFr !== fr) {
      // Validate: no remaining EN-decimal comma forms
      const badComma = uniquePreserveOrder(extractEnNumbers(en)).filter((n) => {
        if (!n.includes(".")) return false;
        const [i, f] = n.split(".");
        return new RegExp(`(?<!\\d)${escapeReg(i)},${escapeReg(f)}(?!\\d)`).test(nextFr);
      });
      const badSpace = uniquePreserveOrder(extractEnNumbers(en)).filter((n) => {
        if (n.includes(".") || n.length < 4) return false;
        const re = new RegExp(`(?<!\\d)${spacedIntegerPattern(n)}(?!\\d)`);
        const m = nextFr.match(new RegExp(spacedIntegerPattern(n), "g"));
        // if any match still contains whitespace, bad
        return (m || []).some((x) => /[\s\u00A0\u202F\u2009\u2007]/.test(x));
      });
      if (badComma.length || badSpace.length) {
        failures.push({
          id: row.id,
          reason: `FR residual localized numbers: comma=[${badComma.join(",")}] space=[${badSpace.join(",")}]`,
        });
      } else {
        frVehicleIds.add(row.id);
        frChanges += Math.max(frFix.changeCount, 1);
        if (examples.filter((e) => e.locale === "fr").length < 5) {
          const b = fr.split(/\r?\n/);
          const a = nextFr.split(/\r?\n/);
          for (let i = 0; i < Math.max(b.length, a.length); i++) {
            if ((b[i] || "") !== (a[i] || "")) {
              examples.push({
                id: row.id,
                locale: "fr",
                before: b[i] || "",
                after: a[i] || "",
              });
              break;
            }
          }
        }
      }
    }

    // ZH
    const frag = restoreZhEnglishFragments(en, zh);
    const zhNum = normalizeNumberSpellings(en, frag.text);
    const nextZh = zhNum.text;
    const zhChangeCount = frag.changeCount + zhNum.changeCount;
    if (nextZh !== zh) {
      zhVehicleIds.add(row.id);
      zhChanges += Math.max(zhChangeCount, 1);
      if (examples.filter((e) => e.locale === "zh").length < 5) {
        const b = zh.split(/\r?\n/);
        const a = nextZh.split(/\r?\n/);
        for (let i = 0; i < Math.max(b.length, a.length); i++) {
          if ((b[i] || "") !== (a[i] || "")) {
            examples.push({
              id: row.id,
              locale: "zh",
              before: b[i] || "",
              after: a[i] || "",
            });
            break;
          }
        }
      }
    }
  }

  const vehiclesToFix = new Set([...frVehicleIds, ...zhVehicleIds]).size;

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        totalVehicles: rows.length,
        vehiclesToFix,
        frVehicles: frVehicleIds.size,
        zhVehicles: zhVehicleIds.size,
        frChanges,
        zhChanges,
        frVehicleIds: [...frVehicleIds].sort(),
        zhVehicleIds: [...zhVehicleIds].sort(),
        failures: failures.length,
        failureDetails: failures,
        examples,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
