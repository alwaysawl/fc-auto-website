import "server-only";

/*
 * ─── SUPABASE TABLE DDL ──────────────────────────────────────────────────────
 * Run this SQL once in your Supabase SQL editor before using these helpers.
 *
 * create table if not exists public.vehicles (
 *   id              text primary key,
 *   brand           text not null,
 *   model           text not null,
 *   year            integer not null,
 *   mileage         integer not null default 0,
 *   fuel            text not null default 'Petrol',
 *   transmission    text not null default 'Automatic',
 *   steering        text not null default 'Left Hand Drive',
 *   vin             text not null default '',
 *   fob_price       numeric not null default 0,
 *   photos          text[] not null default '{}',
 *   shipping_tiers  jsonb not null default '[]',
 *   featured        boolean not null default false,
 *   status          text not null default '在售',
 *   currency        text not null default 'USD',
 *   body_type       text,
 *   drive_type      text,
 *   displacement    text,
 *   color           text,
 *   seats           integer,
 *   export_port     text,
 *   location        text,
 *   title_en        text,
 *   description_en  text,
 *   features        text,
 *   notes               text,
 *   main_image_url      text,
 *   gallery_image_urls  text[] not null default '{}',
 *   created_at          timestamptz not null default now(),
 *   updated_at          timestamptz not null default now()
 * );
 *
 * ── Phase 2B migration (run if table already exists) ─────────────────────────
 * alter table public.vehicles
 *   add column if not exists main_image_url     text,
 *   add column if not exists gallery_image_urls text[] not null default '{}';
 *
 * ── Drive type migration (20260801) ──────────────────────────────────────────
 * alter table public.vehicles
 *   add column if not exists drive_type text;
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * alter table public.vehicles enable row level security;
 * -- Allow service_role full access (used by this server-only helper):
 * create policy "service_role_all" on public.vehicles
 *   for all to service_role using (true) with check (true);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getSupabaseAdmin } from "./admin";
import type { Vehicle, ShippingTier } from "@/lib/types";

// ─── Row shape returned by Supabase ──────────────────────────────────────────
interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  steering: string;
  vin: string;
  fob_price: number;
  photos: string[];
  shipping_tiers: ShippingTier[];
  featured: boolean;
  status: string;
  currency: string | null;
  body_type: string | null;
  drive_type: string | null;
  displacement: string | null;
  color: string | null;
  seats: number | null;
  export_port: string | null;
  location: string | null;
  title_en: string | null;
  description_en: string | null;
  features: string | null;
  notes: string | null;
  // Structured image fields (added in Phase 2B)
  main_image_url: string | null;
  gallery_image_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function rowToVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    mileage: row.mileage,
    fuel: row.fuel,
    transmission: row.transmission,
    steering: row.steering,
    vin: row.vin,
    fobPrice: row.fob_price,
    photos: row.photos ?? [],
    shippingTiers: row.shipping_tiers ?? [],
    featured: row.featured,
    status: row.status as Vehicle["status"],
    currency: row.currency ?? undefined,
    bodyType: row.body_type ?? undefined,
    driveType: row.drive_type?.trim() || undefined,
    displacement: row.displacement ?? undefined,
    color: row.color ?? undefined,
    seats: row.seats ?? undefined,
    exportPort: row.export_port ?? undefined,
    location: row.location ?? undefined,
    titleEn: row.title_en ?? undefined,
    descriptionEn: row.description_en ?? undefined,
    features: row.features ?? undefined,
    notes: row.notes ?? undefined,
    mainImageUrl: row.main_image_url ?? undefined,
    galleryImageUrls: row.gallery_image_urls ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function vehicleToInsertRow(v: Vehicle): Omit<VehicleRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string } {
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
    photos: v.photos ?? [],
    shipping_tiers: v.shippingTiers ?? [],
    featured: v.featured ?? false,
    status: v.status ?? "草稿",
    currency: v.currency ?? "USD",
    body_type: v.bodyType ?? null,
    drive_type: v.driveType?.trim() || null,
    displacement: v.displacement ?? null,
    color: v.color ?? null,
    seats: v.seats ?? null,
    export_port: v.exportPort ?? null,
    location: v.location ?? null,
    title_en: v.titleEn ?? null,
    description_en: v.descriptionEn ?? null,
    main_image_url: v.mainImageUrl ?? null,
    gallery_image_urls: v.galleryImageUrls ?? null,
    features: v.features ?? null,
    notes: v.notes ?? null,
  };
}

function vehicleToUpdateRow(updates: Partial<Vehicle>): Partial<VehicleRow> {
  const row: Partial<VehicleRow> = {};
  if (updates.brand !== undefined)        row.brand = updates.brand;
  if (updates.model !== undefined)        row.model = updates.model;
  if (updates.year !== undefined)         row.year = updates.year;
  if (updates.mileage !== undefined)      row.mileage = updates.mileage;
  if (updates.fuel !== undefined)         row.fuel = updates.fuel;
  if (updates.transmission !== undefined) row.transmission = updates.transmission;
  if (updates.steering !== undefined)     row.steering = updates.steering;
  if (updates.vin !== undefined)          row.vin = updates.vin;
  if (updates.fobPrice !== undefined)     row.fob_price = updates.fobPrice;
  if (updates.photos !== undefined)       row.photos = updates.photos;
  if (updates.shippingTiers !== undefined) row.shipping_tiers = updates.shippingTiers;
  if (updates.featured !== undefined)     row.featured = updates.featured;
  if (updates.status !== undefined)       row.status = updates.status;
  if (updates.currency !== undefined)     row.currency = updates.currency;
  if (updates.bodyType !== undefined)     row.body_type = updates.bodyType;
  if (updates.driveType !== undefined)    row.drive_type = updates.driveType?.trim() || null;
  if (updates.displacement !== undefined) row.displacement = updates.displacement;
  if (updates.color !== undefined)        row.color = updates.color;
  if (updates.seats !== undefined)        row.seats = updates.seats;
  if (updates.exportPort !== undefined)   row.export_port = updates.exportPort;
  if (updates.location !== undefined)     row.location = updates.location;
  if (updates.titleEn !== undefined)      row.title_en = updates.titleEn;
  if (updates.descriptionEn !== undefined) row.description_en = updates.descriptionEn;
  if (updates.features !== undefined)     row.features = updates.features;
  if (updates.notes !== undefined)        row.notes = updates.notes;
  if (updates.mainImageUrl !== undefined) row.main_image_url = updates.mainImageUrl ?? null;
  if (updates.galleryImageUrls !== undefined) {
    row.gallery_image_urls = updates.galleryImageUrls ?? [];
  }
  row.updated_at = new Date().toISOString();
  return row;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Strict public column allowlist — VIN and notes are never selected. */
export const PUBLIC_VEHICLE_SELECT = [
  "id",
  "brand",
  "model",
  "year",
  "mileage",
  "fuel",
  "transmission",
  "steering",
  "fob_price",
  "photos",
  "shipping_tiers",
  "featured",
  "status",
  "currency",
  "body_type",
  "drive_type",
  "displacement",
  "color",
  "seats",
  "export_port",
  "location",
  "title_en",
  "description_en",
  "features",
  "main_image_url",
  "gallery_image_urls",
  "created_at",
  "updated_at",
].join(", ");

type PublicVehicleRow = Omit<VehicleRow, "vin" | "notes">;

/** Public vehicle shape: VIN/notes keys are never present. */
export type PublicVehicle = Omit<Vehicle, "vin" | "notes">;

function rowToPublicVehicle(row: PublicVehicleRow): PublicVehicle {
  const vehicle: PublicVehicle = {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    mileage: row.mileage,
    fuel: row.fuel,
    transmission: row.transmission,
    steering: row.steering,
    fobPrice: row.fob_price,
    photos: row.photos ?? [],
    shippingTiers: row.shipping_tiers ?? [],
    featured: row.featured,
    status: row.status as Vehicle["status"],
    currency: row.currency ?? undefined,
    bodyType: row.body_type ?? undefined,
    driveType: row.drive_type?.trim() || undefined,
    displacement: row.displacement ?? undefined,
    color: row.color ?? undefined,
    seats: row.seats ?? undefined,
    exportPort: row.export_port ?? undefined,
    location: row.location ?? undefined,
    titleEn: row.title_en ?? undefined,
    descriptionEn: row.description_en ?? undefined,
    features: row.features ?? undefined,
    mainImageUrl: row.main_image_url ?? undefined,
    galleryImageUrls: row.gallery_image_urls ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return withPublicPhotos(vehicle);
}

export async function dbGetAllVehicles(): Promise<Vehicle[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as VehicleRow[]).map(rowToVehicle);
}

/**
 * Public inventory: in-stock vehicles only, ordered for storefront display.
 * Selects an explicit allowlist — VIN/notes are excluded at the query level.
 */
export async function dbGetPublicVehicles(): Promise<PublicVehicle[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select(PUBLIC_VEHICLE_SELECT)
    .eq("status", "在售")
    .order("featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    const code = error.code ? ` [code: ${error.code}]` : "";
    console.error("[dbGetPublicVehicles]", error.message, error.code ?? "");
    throw new Error(`${error.message}${code}`);
  }

  return ((data ?? []) as unknown as PublicVehicleRow[]).map(rowToPublicVehicle);
}

/** Prefer main_image_url for card display; fall back only when empty. */
export function withPublicPhotos(vehicle: PublicVehicle): PublicVehicle {
  return { ...vehicle, photos: buildVehicleGallery(vehicle) };
}

/** Deduped gallery: main → gallery → photos; never blob:; fallback if empty. */
export function buildVehicleGallery(vehicle: Pick<Vehicle, "mainImageUrl" | "galleryImageUrls" | "photos">): string[] {
  const FALLBACK = "/images/rav4.jpg";
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (url?: string | null) => {
    const trimmed = url?.trim();
    if (!trimmed || trimmed.startsWith("blob:") || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  push(vehicle.mainImageUrl);
  for (const url of vehicle.galleryImageUrls ?? []) push(url);
  for (const url of vehicle.photos ?? []) push(url);

  return out.length > 0 ? out : [FALLBACK];
}

export async function dbGetVehicleById(id: string): Promise<Vehicle | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToVehicle(data as VehicleRow);
}

/**
 * Public detail: only 在售 vehicles are visible on the storefront.
 * VIN/notes excluded at the database select level.
 */
export async function dbGetPublicVehicleById(id: string): Promise<PublicVehicle | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select(PUBLIC_VEHICLE_SELECT)
    .eq("id", id)
    .eq("status", "在售")
    .maybeSingle();

  if (error) {
    const code = error.code ? ` [code: ${error.code}]` : "";
    console.error("[dbGetPublicVehicleById]", error.message, error.code ?? "");
    throw new Error(`${error.message}${code}`);
  }
  if (!data) return null;
  return rowToPublicVehicle(data as unknown as PublicVehicleRow);
}

/**
 * Similar vehicles for detail page (same count as before: 3).
 * Prefer same brand or body_type, then fill from other 在售 vehicles.
 */
export async function dbGetSimilarPublicVehicles(
  current: Pick<Vehicle, "id" | "brand" | "bodyType">,
  limit = 3
): Promise<PublicVehicle[]> {
  const all = await dbGetPublicVehicles();
  const others = all.filter((v) => v.id !== current.id);

  const preferred = others.filter(
    (v) =>
      v.brand === current.brand ||
      (!!current.bodyType &&
        !!v.bodyType &&
        v.bodyType.toLowerCase() === current.bodyType.toLowerCase())
  );
  const preferredIds = new Set(preferred.map((v) => v.id));
  const rest = others.filter((v) => !preferredIds.has(v.id));

  return [...preferred, ...rest].slice(0, limit);
}

export async function dbCreateVehicle(vehicle: Vehicle): Promise<Vehicle> {
  const supabase = getSupabaseAdmin();
  const row = vehicleToInsertRow(vehicle);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...row, created_at: now, updated_at: now })
    .select()
    .single();

  if (error) {
    // PostgreSQL unique violation
    if (error.code === "23505") {
      throw new Error(
        `库存编号 "${vehicle.id}" 已存在，请使用其他编号。 [code: ${error.code}]`
      );
    }
    throw new Error(`${error.message} [code: ${error.code ?? "UNKNOWN"}]`);
  }
  return rowToVehicle(data as VehicleRow);
}

export async function dbUpdateVehicle(
  id: string,
  updates: Partial<Vehicle>
): Promise<Vehicle | null> {
  const supabase = getSupabaseAdmin();
  const row = vehicleToUpdateRow(updates);

  const { data, error } = await supabase
    .from("vehicles")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`${error.message} [code: ${error.code ?? "UNKNOWN"}]`);
  if (!data) return null;
  return rowToVehicle(data as VehicleRow);
}

export async function dbDeleteVehicle(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("vehicles")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw new Error(`${error.message} [code: ${error.code ?? "UNKNOWN"}]`);
  return (count ?? 0) > 0;
}
