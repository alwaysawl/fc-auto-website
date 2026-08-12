/**
 * Backfill vehicle main configuration translations in small batches.
 *
 * - Source of truth: existing `features` (English)
 * - Writes only: `features_fr`, `features_zh`
 * - Never overwrites non-empty translations
 * - Never updates `features` or any other vehicle fields
 *
 * Usage:
 *   npx tsx scripts/backfill-vehicle-features-multilang.ts --dry-run
 *   npx tsx scripts/backfill-vehicle-features-multilang.ts --execute --batch-size 5
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type VehicleRow = {
  id: string;
  status: string | null;
  features: string | null;
  features_fr: string | null;
  features_zh: string | null;
};

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  try {
    const txt = readFileSync(envPath, "utf8");
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

function nonEmpty(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

function stamp() {
  const d = new Date();
  const p = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateGoogleUnofficial(
  text: string,
  target: "fr" | "zh-CN",
  retries = 3
): Promise<string> {
  const encoded = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encoded}`;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as any[];
      const segments = Array.isArray(data?.[0]) ? data[0] : [];
      const out = segments
        .map((seg: any) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
        .join("");
      return out.trim();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(600 * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--execute");
  const execute = !dryRun;
  const batchSize = Math.max(1, Number(parseArg("--batch-size") ?? "5"));
  const status = "在售";

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing SUPABASE_URL/SUPABASE_SECRET_KEY in env.");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const probe = await supabase
    .from("vehicles")
    .select("id, features_fr, features_zh")
    .limit(1);
  if (probe.error) {
    throw new Error(
      `Missing translation columns. Run migration first. ${probe.error.message} (${probe.error.code ?? ""})`
    );
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("id,status,features,features_fr,features_zh")
    .eq("status", status)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Query failed: ${error.message}`);
  const rows = (data ?? []) as VehicleRow[];

  const missingFrIds: string[] = [];
  const missingZhIds: string[] = [];
  const candidates = rows.filter((r) => nonEmpty(r.features));
  for (const r of candidates) {
    if (!nonEmpty(r.features_fr)) missingFrIds.push(r.id);
    if (!nonEmpty(r.features_zh)) missingZhIds.push(r.id);
  }

  const needAny = candidates.filter((r) => !nonEmpty(r.features_fr) || !nonEmpty(r.features_zh));
  const batch = needAny.slice(0, batchSize);

  const backupDir = join(process.cwd(), "scripts", "backfill-backup");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(backupDir, `vehicle_features_batch_${stamp()}.json`);
  writeFileSync(
    backupPath,
    JSON.stringify(
      batch.map((r) => ({
        id: r.id,
        features: r.features,
        features_fr: r.features_fr,
        features_zh: r.features_zh,
      })),
      null,
      2
    ),
    "utf8"
  );

  let frFilled = 0;
  let zhFilled = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const r of batch) {
    const updates: Record<string, string> = {};
    const source = (r.features ?? "").trim();
    if (!source) continue;

    try {
      if (!nonEmpty(r.features_fr)) {
        const fr = await translateGoogleUnofficial(source, "fr");
        if (fr) updates.features_fr = fr;
      }
      if (!nonEmpty(r.features_zh)) {
        const zh = await translateGoogleUnofficial(source, "zh-CN");
        if (zh) updates.features_zh = zh;
      }

      if (Object.keys(updates).length === 0) continue;

      if (execute) {
        const { error: updateError } = await supabase
          .from("vehicles")
          .update(updates)
          .eq("id", r.id);
        if (updateError) {
          const msg = `${updateError.message} (${updateError.code ?? ""})`;
          if (/high load/i.test(msg)) {
            console.error("HIGH_LOAD_STOP", r.id, msg);
            throw new Error(`HIGH_LOAD_STOP ${r.id} ${msg}`);
          }
          failures.push({ id: r.id, error: msg });
          continue;
        }
      }

      if (updates.features_fr) frFilled += 1;
      if (updates.features_zh) zhFilled += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ id: r.id, error: msg });
      if (/HIGH_LOAD_STOP/.test(msg)) {
        break;
      }
    }
  }

  console.log("=== Backfill batch summary ===");
  console.log(`execute: ${execute}`);
  console.log(`status filter: ${status}`);
  console.log(`found vehicles: ${rows.length}`);
  console.log(`vehicles with non-empty features: ${candidates.length}`);
  console.log(`needs any translation: ${needAny.length}`);
  console.log(`batch size requested: ${batchSize}`);
  console.log(`batch size processed: ${batch.length}`);
  console.log(`needs features_fr total: ${missingFrIds.length}`);
  console.log(`needs features_zh total: ${missingZhIds.length}`);
  console.log(`filled features_fr this batch: ${frFilled}`);
  console.log(`filled features_zh this batch: ${zhFilled}`);
  console.log(`failures this batch: ${failures.length}`);
  console.log(`missingFrIds: ${missingFrIds.join(", ")}`);
  console.log(`missingZhIds: ${missingZhIds.join(", ")}`);
  if (failures.length) {
    console.log(
      `failureIds: ${failures.map((f) => `${f.id}:${f.error}`).join(" | ")}`
    );
  }
  console.log(`backup: ${backupPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

