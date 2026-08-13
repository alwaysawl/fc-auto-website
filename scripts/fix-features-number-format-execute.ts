/**
 * Execute number-format fix for features_fr / features_zh.
 * Same logic as dry-run. Writes ONLY features_fr / features_zh.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

function normalizeNumberSpellings(
  en: string,
  target: string
): { text: string; changeCount: number } {
  let text = target;
  let changeCount = 0;
  const nums = uniquePreserveOrder(extractEnNumbers(en)).sort(
    (a, b) => b.length - a.length
  );

  for (const enNum of nums) {
    if (enNum.includes(".")) {
      const [i, f] = enNum.split(".");
      const re = new RegExp(
        `(?<!\\d)${escapeReg(i)},${escapeReg(f)}(?!\\d)`,
        "g"
      );
      text = text.replace(re, (matched) => {
        if (matched === enNum) return matched;
        changeCount += 1;
        return enNum;
      });
    } else if (enNum.length >= 4) {
      const re = new RegExp(`(?<!\\d)${spacedIntegerPattern(enNum)}(?!\\d)`, "g");
      text = text.replace(re, (matched) => {
        const compact = matched.replace(/[\s\u00A0\u202F\u2009\u2007]/g, "");
        if (matched === enNum) return matched;
        if (compact !== enNum) return matched;
        changeCount += 1;
        return enNum;
      });
    }
  }

  return { text, changeCount };
}

function extractEnFragment(en: string, re: RegExp, fallback: string): string {
  const m = en.match(re);
  return m ? m[0] : fallback;
}

function restoreZhEnglishFragments(
  en: string,
  zh: string
): { text: string; changeCount: number } {
  let text = zh;
  let changeCount = 0;
  const replacements: Array<{ zhRe: RegExp; to: string }> = [];

  if (/\binline-4\b/i.test(en)) {
    replacements.push({
      zhRe: /直列四缸/g,
      to: extractEnFragment(en, /\binline-4\b/i, "inline-4"),
    });
  }
  if (/\b4WD\b/.test(en)) {
    const onDemand = extractEnFragment(en, /On[-\s]?demand\s+4WD/i, "");
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
      return r.to;
    });
  }

  return { text, changeCount };
}

function stamp() {
  const d = new Date();
  const p = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
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

  // Full backup before any writes
  const backupDir = join(process.cwd(), "scripts", "backfill-backup");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `features_number_fix_backup_${stamp()}.json`
  );
  const enSnapshot = rows.map((r) => ({
    id: r.id,
    features: r.features,
    features_fr: r.features_fr,
    features_zh: r.features_zh,
  }));
  writeFileSync(backupPath, JSON.stringify(enSnapshot, null, 2), "utf8");

  const failures: Array<{ id: string; reason: string }> = [];
  let frUpdated = 0;
  let zhUpdated = 0;
  let vehiclesTouched = 0;

  for (const row of rows) {
    const en = row.features || "";
    const fr = row.features_fr || "";
    const zh = row.features_zh || "";
    if (!en.trim()) {
      failures.push({ id: row.id, reason: "empty English features" });
      continue;
    }

    const frFix = normalizeNumberSpellings(en, fr);
    const nextFr = frFix.text;

    const frag = restoreZhEnglishFragments(en, zh);
    const zhNum = normalizeNumberSpellings(en, frag.text);
    const nextZh = zhNum.text;

    // Residual localized FR forms check (same as dry-run)
    const badComma = uniquePreserveOrder(extractEnNumbers(en)).filter((n) => {
      if (!n.includes(".")) return false;
      const [i, f] = n.split(".");
      return new RegExp(
        `(?<!\\d)${escapeReg(i)},${escapeReg(f)}(?!\\d)`
      ).test(nextFr);
    });
    const badSpace = uniquePreserveOrder(extractEnNumbers(en)).filter((n) => {
      if (n.includes(".") || n.length < 4) return false;
      const matches = nextFr.match(new RegExp(spacedIntegerPattern(n), "g")) || [];
      return matches.some((x) => /[\s\u00A0\u202F\u2009\u2007]/.test(x));
    });
    if (badComma.length || badSpace.length) {
      failures.push({
        id: row.id,
        reason: `FR residual localized numbers comma=[${badComma.join(",")}] space=[${badSpace.join(",")}]`,
      });
      continue;
    }

    const updates: Record<string, string> = {};
    if (nextFr !== fr) updates.features_fr = nextFr;
    if (nextZh !== zh) updates.features_zh = nextZh;
    if (Object.keys(updates).length === 0) continue;

    const { error: updateError } = await supabase
      .from("vehicles")
      .update(updates)
      .eq("id", row.id);

    if (updateError) {
      failures.push({
        id: row.id,
        reason: `${updateError.message} (${updateError.code ?? ""})`,
      });
      continue;
    }

    vehiclesTouched += 1;
    if (updates.features_fr) frUpdated += 1;
    if (updates.features_zh) zhUpdated += 1;
  }

  // Re-check
  const { data: after, error: afterErr } = await supabase
    .from("vehicles")
    .select("id, features, features_fr, features_zh")
    .eq("status", "在售")
    .order("id");
  if (afterErr) throw new Error(afterErr.message);
  const afterRows = (after || []) as VehicleRow[];

  const beforeById = new Map(enSnapshot.map((r) => [r.id, r]));
  let featuresUnchanged = 0;
  let featuresChanged = 0;
  let frNonEmpty = 0;
  let zhNonEmpty = 0;
  const featuresChangedIds: string[] = [];
  const missingFr: string[] = [];
  const missingZh: string[] = [];

  for (const r of afterRows) {
    const before = beforeById.get(r.id);
    const enSame = (before?.features ?? null) === (r.features ?? null);
    if (enSame) featuresUnchanged += 1;
    else {
      featuresChanged += 1;
      featuresChangedIds.push(r.id);
    }
    if ((r.features_fr || "").trim()) frNonEmpty += 1;
    else missingFr.push(r.id);
    if ((r.features_zh || "").trim()) zhNonEmpty += 1;
    else missingZh.push(r.id);
  }

  const rav4 = afterRows.find((r) => r.id === "toyota-rav4-2023");
  const rav4Fr = rav4?.features_fr || "";
  const rav4Has641 = /(?<!\d)6\.41(?!\d)/.test(rav4Fr);
  const rav4HasBadComma = /(?<!\d)6,41(?!\d)/.test(rav4Fr);
  const rav4FuelLine =
    (rav4Fr.split(/\r?\n/).find((l) => /6\.41|6,41|L\/100/i.test(l)) || "").trim();

  console.log(
    JSON.stringify(
      {
        execute: true,
        backupPath,
        total: afterRows.length,
        vehiclesTouched,
        frUpdated,
        zhUpdated,
        failures: failures.length,
        failureDetails: failures,
        featuresUnchanged,
        featuresChanged,
        featuresChangedIds,
        frNonEmpty,
        zhNonEmpty,
        missingFr,
        missingZh,
        toyotaRav42023: {
          hasExact641: rav4Has641,
          hasComma641: rav4HasBadComma,
          fuelLine: rav4FuelLine,
        },
      },
      null,
      2
    )
  );

  if (failures.length > 0) process.exitCode = 1;
  if (featuresChanged > 0) process.exitCode = 1;
  if (frNonEmpty !== afterRows.length || zhNonEmpty !== afterRows.length) {
    process.exitCode = 1;
  }
  if (!rav4Has641 || rav4HasBadComma) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
