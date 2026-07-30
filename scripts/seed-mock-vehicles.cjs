/**
 * Idempotent seed: upsert mock vehicles into public.vehicles.
 *
 * - Only touches the known mock IDs (never deletes other rows)
 * - Upserts with onConflict: "id"
 * - Unrelated live vehicles (e.g. published listings) are not deleted
 *
 * Manual run (do not auto-run from the app):
 *   node scripts/seed-mock-vehicles.cjs
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

function loadMockVehicles() {
  const storePath = path.join(process.cwd(), "data", "store.json");
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (Array.isArray(store.vehicles) && store.vehicles.length > 0) {
      return store.vehicles;
    }
  }
  // Fallback: same defaults as src/lib/data.ts getDefaultData()
  return require("./_mock-vehicles-fallback.cjs");
}

function toRow(v) {
  const now = new Date().toISOString();
  const photos = Array.isArray(v.photos) ? v.photos.filter(Boolean) : [];
  const main = photos[0] || null;
  const gallery = photos.slice(1);
  return {
    id: v.id,
    brand: v.brand,
    model: v.model,
    year: v.year,
    mileage: v.mileage ?? 0,
    fuel: v.fuel ?? "Petrol",
    transmission: v.transmission ?? "Automatic",
    steering: v.steering ?? "Left Hand Drive",
    vin: v.vin ?? "",
    fob_price: v.fobPrice ?? 0,
    photos,
    shipping_tiers: v.shippingTiers ?? [],
    featured: !!v.featured,
    status: "在售",
    currency: v.currency ?? "USD",
    body_type: v.bodyType ?? null,
    displacement: v.displacement ?? null,
    color: v.color ?? null,
    seats: v.seats ?? null,
    export_port: v.exportPort ?? null,
    location: v.location ?? null,
    title_en: v.titleEn ?? null,
    description_en: v.descriptionEn ?? null,
    features: v.features ?? null,
    notes: v.notes ?? null,
    main_image_url: v.mainImageUrl ?? main,
    gallery_image_urls: v.galleryImageUrls ?? gallery,
    updated_at: now,
    // created_at only set on insert; ignoreDuplicates false means upsert updates
    // Keep created_at on conflict by not forcing it on update — PostgREST upsert
    // sends full row; use created_at: now only for new rows is hard with bulk upsert.
    // Prefer preserving created_at: omit from update via ignoreDuplicates isn't available.
    // We'll set created_at = now; first insert wins semantically for seed.
    created_at: now,
  };
}

async function main() {
  const env = loadEnv();
  const url =
    (env.SUPABASE_URL ?? "").trim() ||
    (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key =
    (env.SUPABASE_SECRET_KEY ?? "").trim() ||
    (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim() ||
    (env.SUPABASE_ANON_KEY ?? "").trim() ||
    (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or a Supabase key (SECRET/SERVICE_ROLE/ANON) in .env.local"
    );
    process.exit(1);
  }

  const mocks = loadMockVehicles();
  if (!mocks.length) {
    console.error("No mock vehicles found in data/store.json");
    process.exit(1);
  }

  const rows = mocks.map(toRow);
  const mockIds = rows.map((r) => r.id);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Which of these mock IDs already exist?
  const { data: beforeRows, error: beforeErr } = await supabase
    .from("vehicles")
    .select("id")
    .in("id", mockIds);

  if (beforeErr) {
    console.error("Pre-check failed:", beforeErr.message, beforeErr.code ?? "");
    process.exit(1);
  }

  const existingBefore = new Set((beforeRows ?? []).map((r) => r.id));

  const { data: existingFull, error: existingFullErr } = await supabase
    .from("vehicles")
    .select("id, created_at")
    .in("id", mockIds);

  if (existingFullErr) {
    console.error("created_at pre-check failed:", existingFullErr.message);
    process.exit(1);
  }

  const createdAtById = new Map(
    (existingFull ?? []).map((r) => [r.id, r.created_at])
  );

  const rowsForUpsert = rows.map((row) => {
    if (createdAtById.has(row.id)) {
      return { ...row, created_at: createdAtById.get(row.id) };
    }
    return row;
  });

  const { data, error } = await supabase
    .from("vehicles")
    .upsert(rowsForUpsert, { onConflict: "id" })
    .select("id");

  if (error) {
    console.error("Upsert failed:", error.message, error.code ?? "");
    process.exit(1);
  }

  const upsertedIds = (data ?? []).map((r) => r.id);
  const insertedIds = upsertedIds.filter((id) => !existingBefore.has(id));
  const updatedIds = upsertedIds.filter((id) => existingBefore.has(id));

  console.log("Upserted IDs:");
  for (const id of upsertedIds) {
    const tag = existingBefore.has(id) ? "updated" : "inserted";
    console.log(`  [${tag}] ${id}`);
  }
  console.log(
    JSON.stringify(
      {
        preparedFrom: "data/store.json (fallback: src/lib/data.ts defaults)",
        preparedCount: mocks.length,
        upsertedTotal: upsertedIds.length,
        insertedCount: insertedIds.length,
        updatedCount: updatedIds.length,
        insertedIds,
        updatedIds,
        upsertedIds,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
