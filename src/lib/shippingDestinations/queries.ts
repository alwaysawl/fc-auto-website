import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SHIPPING_DESTINATIONS,
  type PortRate,
  type ShippingDestination,
} from "@/data/shippingRates";
import { getSupabaseAdmin, getSupabaseSecretKey } from "@/lib/supabase/admin";
import type {
  ShippingCountryInput,
  ShippingCountryRow,
  ShippingCountryWithPorts,
  ShippingListResult,
  ShippingPortInput,
  ShippingPortRow,
} from "@/lib/shippingDestinations/types";
import { sortShippingCountries } from "@/lib/shippingDestinations/sortCountries";

export type ShippingFallbackReason =
  | "tables_missing"
  | "client_unavailable"
  | null;

export { sortShippingCountries };

type DbErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

/** Safe diagnostics only — never log key values or full URLs with secrets. */
function logShippingDbError(context: string, error: DbErrorLike, extra?: Record<string, unknown>) {
  console.error(`[shippingDestinations] ${context}`, {
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    hasSupabaseUrl: Boolean(
      (process.env.SUPABASE_URL ?? "").trim() ||
        (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()
    ),
    hasSupabaseSecretKey: Boolean((process.env.SUPABASE_SECRET_KEY ?? "").trim()),
    hasSupabaseServiceRoleKey: Boolean(
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()
    ),
    ...extra,
  });
}

/**
 * True only when PostgREST/Postgres reports the relation itself is missing
 * (or not yet in schema cache). Permission / RLS failures must NOT match.
 */
function isMissingRelationError(error: DbErrorLike): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("permission denied") || msg.includes("row-level security")) {
    return false;
  }
  return (
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (/shipping_(countries|ports)/.test(msg) && msg.includes("does not exist"))
  );
}

function userFacingDbError(error: DbErrorLike, fallback: string): string {
  if (!error) return fallback;
  if (isMissingRelationError(error)) {
    return "运费数据表尚未创建，请先在 Supabase 执行迁移 SQL";
  }
  if (error.code === "23505") {
    return fallback.includes("港口") ? "同一国家下港口已存在，请勿重复添加" : "国家已存在，请勿重复添加";
  }
  return fallback;
}

function requireShippingClient(): SupabaseClient {
  try {
    return getSupabaseAdmin();
  } catch (err) {
    logShippingDbError(
      "getSupabaseAdmin failed",
      {
        message: err instanceof Error ? err.message : "unknown",
      },
      { phase: "client_init" }
    );
    throw new Error("服务器未配置数据库连接，无法管理运费");
  }
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseEnabled(value: unknown): boolean {
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "false" || v === "f" || v === "no" || v === "off") return false;
  }
  return true;
}

function mapCountry(row: Record<string, unknown>): ShippingCountryRow {
  return {
    id: String(row.id),
    name_en: String(row.name_en ?? ""),
    name_fr: row.name_fr == null ? null : String(row.name_fr),
    name_zh: row.name_zh == null ? null : String(row.name_zh),
    enabled: parseEnabled(row.enabled),
    display_order: Number(row.display_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapPort(row: Record<string, unknown>): ShippingPortRow {
  return {
    id: String(row.id),
    country_id: String(row.country_id),
    port_id: String(row.port_id),
    name_en: String(row.name_en ?? ""),
    name_fr: row.name_fr == null ? null : String(row.name_fr),
    name_zh: row.name_zh == null ? null : String(row.name_zh),
    single_vehicle_usd: num(row.single_vehicle_usd),
    container_40ft_usd: num(row.container_40ft_usd),
    enabled: parseEnabled(row.enabled),
    display_order: Number(row.display_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/** Sort helper lives in sortCountries.ts (shared with client). */

function peekJwtRole(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function supabaseHostHint(): string | null {
  try {
    const raw =
      (process.env.SUPABASE_URL ?? "").trim() ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
    if (!raw) return null;
    return new URL(raw).host;
  } catch {
    return null;
  }
}

/** Static fallback from shippingRates.ts (sampleCartFreightUsd container method). */
export function getStaticShippingCountriesWithPorts(): ShippingCountryWithPorts[] {
  return SHIPPING_DESTINATIONS.map((dest, index) => ({
    id: dest.countryId,
    name_en: dest.countryName.en,
    name_fr: dest.countryName.fr ?? null,
    name_zh: dest.countryName.zh ?? null,
    enabled: true,
    display_order: (index + 1) * 10,
    ports: dest.ports.map((port, portIndex) => ({
      id: `${dest.countryId}-${port.portId}`,
      country_id: dest.countryId,
      port_id: port.portId,
      name_en: port.portName.en,
      name_fr: port.portName.fr ?? null,
      name_zh: port.portName.zh ?? null,
      single_vehicle_usd: port.sampleCartFreightUsd.singleVehicle.container,
      container_40ft_usd: port.sampleCartFreightUsd.container40ft.container,
      enabled: true,
      display_order: (portIndex + 1) * 10,
    })),
  }));
}

/**
 * Convert admin/DB country+port rows into the cart ShippingDestination shape.
 * Includes minimal sampleFreightUsd mirrors so PortRate typing stays satisfied;
 * cart freight uses sampleCartFreightUsd only.
 */
export function toCartShippingDestinations(
  countries: ShippingCountryWithPorts[],
  options?: { includeDisabled?: boolean }
): ShippingDestination[] {
  const includeDisabled = options?.includeDisabled === true;
  return countries
    .filter((c) => includeDisabled || c.enabled)
    .map((c) => {
      const ports: PortRate[] = c.ports
        .filter((p) => includeDisabled || p.enabled)
        .map((p) => {
          const single = p.single_vehicle_usd;
          const container = p.container_40ft_usd;
          return {
            portId: p.port_id,
            portName: {
              en: p.name_en,
              fr: p.name_fr ?? p.name_en,
              zh: p.name_zh ?? p.name_en,
            },
            sampleFreightUsd: {
              sedan: { roro: single, container: single },
              suv: { roro: single, container: single },
              pickup: { roro: single, container: single },
              minivan: { roro: single, container: single },
              van: { roro: single, container: single },
            },
            sampleCartFreightUsd: {
              singleVehicle: { roro: single, container: single },
              container40ft: { roro: container, container },
            },
          };
        });
      return {
        countryId: c.id,
        countryName: {
          en: c.name_en,
          fr: c.name_fr ?? c.name_en,
          zh: c.name_zh ?? c.name_en,
        },
        ports,
      } satisfies ShippingDestination;
    })
    .filter((d) => d.ports.length > 0);
}

function withCounts(
  countries: ShippingCountryWithPorts[],
  source: "database" | "static",
  tablesMissing: boolean,
  fallbackReason: ShippingFallbackReason
): ShippingListResult {
  const sorted = sortShippingCountries(countries);
  const portCount = sorted.reduce((sum, c) => sum + c.ports.length, 0);
  return {
    countries: sorted,
    source,
    tablesMissing,
    fallbackReason,
    countryCount: sorted.length,
    portCount,
  };
}

function staticFallbackResult(
  enabledOnly: boolean,
  reason: Exclude<ShippingFallbackReason, null>
): ShippingListResult {
  const countries = getStaticShippingCountriesWithPorts();
  const filtered = enabledOnly
    ? countries
        .filter((c) => c.enabled)
        .map((c) => ({ ...c, ports: c.ports.filter((p) => p.enabled) }))
    : countries;
  return withCounts(filtered, "static", reason === "tables_missing", reason);
}

export async function listShippingCountriesWithPorts(options?: {
  enabledOnly?: boolean;
}): Promise<ShippingListResult> {
  const enabledOnly = options?.enabledOnly === true;

  let supabase: SupabaseClient;
  let keyRole: string | null = null;
  try {
    keyRole = peekJwtRole(getSupabaseSecretKey());
    supabase = getSupabaseAdmin();
  } catch (err) {
    logShippingDbError(
      "listShippingCountriesWithPorts: client unavailable",
      {
        message: err instanceof Error ? err.message : "unknown",
      },
      { fallback: "client_unavailable", supabaseHost: supabaseHostHint() }
    );
    return staticFallbackResult(enabledOnly, "client_unavailable");
  }

  let countryQuery = supabase
    .from("shipping_countries")
    .select(
      "id, name_en, name_fr, name_zh, enabled, display_order, created_at, updated_at"
    )
    .order("display_order", { ascending: true })
    .order("name_en", { ascending: true });
  if (enabledOnly) countryQuery = countryQuery.eq("enabled", true);

  const { data: countryData, error: countryError } = await countryQuery;

  if (countryError) {
    logShippingDbError("listShippingCountriesWithPorts: countries", countryError, {
      keyRole,
      supabaseHost: supabaseHostHint(),
    });
    if (isMissingRelationError(countryError)) {
      return staticFallbackResult(enabledOnly, "tables_missing");
    }
    throw new Error("加载运费国家失败，请稍后重试");
  }

  let portQuery = supabase
    .from("shipping_ports")
    .select(
      "id, country_id, port_id, name_en, name_fr, name_zh, single_vehicle_usd, container_40ft_usd, enabled, display_order, created_at, updated_at"
    )
    .order("display_order", { ascending: true })
    .order("name_en", { ascending: true });
  if (enabledOnly) portQuery = portQuery.eq("enabled", true);

  const { data: portData, error: portError } = await portQuery;

  if (portError) {
    logShippingDbError("listShippingCountriesWithPorts: ports", portError, {
      keyRole,
      supabaseHost: supabaseHostHint(),
    });
    if (isMissingRelationError(portError)) {
      return staticFallbackResult(enabledOnly, "tables_missing");
    }
    throw new Error("加载运费港口失败，请稍后重试");
  }

  const portsByCountry = new Map<string, ShippingPortRow[]>();
  for (const raw of portData ?? []) {
    const port = mapPort(raw as Record<string, unknown>);
    const list = portsByCountry.get(port.country_id) ?? [];
    list.push(port);
    portsByCountry.set(port.country_id, list);
  }

  const countries: ShippingCountryWithPorts[] = (countryData ?? []).map((raw) => {
    const country = mapCountry(raw as Record<string, unknown>);
    return {
      ...country,
      ports: portsByCountry.get(country.id) ?? [],
    };
  });

  const result = withCounts(countries, "database", false, null);

  console.info("[shippingDestinations] list ok", {
    source: result.source,
    countryCount: result.countryCount,
    portCount: result.portCount,
    keyRole,
    supabaseHost: supabaseHostHint(),
  });

  if (result.countryCount === 0 && keyRole === "anon") {
    console.error(
      "[shippingDestinations] empty shipping_countries while using anon key; RLS likely blocks rows. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY."
    );
    throw new Error(
      "运费数据因权限无法读取：请配置 SUPABASE_SECRET_KEY 或 SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return result;
}

export function slugifyPortId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `port-${Date.now()}`;
}

export function slugifyCountryId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 32) || `country-${Date.now()}`;
}

export async function createShippingCountry(
  input: ShippingCountryInput
): Promise<ShippingCountryRow> {
  const supabase = requireShippingClient();

  const id = input.id.trim() || slugifyCountryId(input.name_en);
  const { data, error } = await supabase
    .from("shipping_countries")
    .insert({
      id,
      name_en: input.name_en.trim(),
      name_fr: input.name_fr?.trim() || null,
      name_zh: input.name_zh?.trim() || null,
      enabled: input.enabled !== false,
      display_order: input.display_order ?? 100,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    logShippingDbError("createShippingCountry", error);
    throw new Error(userFacingDbError(error, "添加国家失败"));
  }
  return mapCountry(data as Record<string, unknown>);
}

export async function updateShippingCountry(
  id: string,
  patch: Partial<ShippingCountryInput> & { enabled?: boolean }
): Promise<ShippingCountryRow> {
  const supabase = requireShippingClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name_en !== undefined) updates.name_en = patch.name_en.trim();
  if (patch.name_fr !== undefined) updates.name_fr = patch.name_fr?.trim() || null;
  if (patch.name_zh !== undefined) updates.name_zh = patch.name_zh?.trim() || null;
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.display_order !== undefined) updates.display_order = patch.display_order;

  const { data, error } = await supabase
    .from("shipping_countries")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logShippingDbError("updateShippingCountry", error);
    throw new Error(userFacingDbError(error, "更新国家失败"));
  }
  return mapCountry(data as Record<string, unknown>);
}

export async function deleteShippingCountry(id: string): Promise<void> {
  const supabase = requireShippingClient();

  const { error } = await supabase.from("shipping_countries").delete().eq("id", id);
  if (error) {
    logShippingDbError("deleteShippingCountry", error);
    throw new Error(userFacingDbError(error, "删除国家失败"));
  }
}

export async function createShippingPort(input: ShippingPortInput): Promise<ShippingPortRow> {
  const supabase = requireShippingClient();

  const portId = input.port_id.trim() || slugifyPortId(input.name_en);
  const { data, error } = await supabase
    .from("shipping_ports")
    .insert({
      country_id: input.country_id,
      port_id: portId,
      name_en: input.name_en.trim(),
      name_fr: input.name_fr?.trim() || null,
      name_zh: input.name_zh?.trim() || null,
      single_vehicle_usd: input.single_vehicle_usd,
      container_40ft_usd: input.container_40ft_usd,
      enabled: input.enabled !== false,
      display_order: input.display_order ?? 100,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    logShippingDbError("createShippingPort", error);
    throw new Error(userFacingDbError(error, "添加港口失败"));
  }
  return mapPort(data as Record<string, unknown>);
}

export async function updateShippingPort(
  id: string,
  patch: Partial<ShippingPortInput> & { enabled?: boolean }
): Promise<ShippingPortRow> {
  const supabase = requireShippingClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.port_id !== undefined) updates.port_id = patch.port_id.trim();
  if (patch.name_en !== undefined) updates.name_en = patch.name_en.trim();
  if (patch.name_fr !== undefined) updates.name_fr = patch.name_fr?.trim() || null;
  if (patch.name_zh !== undefined) updates.name_zh = patch.name_zh?.trim() || null;
  if (patch.single_vehicle_usd !== undefined) {
    updates.single_vehicle_usd = patch.single_vehicle_usd;
  }
  if (patch.container_40ft_usd !== undefined) {
    updates.container_40ft_usd = patch.container_40ft_usd;
  }
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.display_order !== undefined) updates.display_order = patch.display_order;

  const { data, error } = await supabase
    .from("shipping_ports")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logShippingDbError("updateShippingPort", error);
    throw new Error(userFacingDbError(error, "更新港口失败"));
  }
  return mapPort(data as Record<string, unknown>);
}

export async function deleteShippingPort(id: string): Promise<void> {
  const supabase = requireShippingClient();

  const { error } = await supabase.from("shipping_ports").delete().eq("id", id);
  if (error) {
    logShippingDbError("deleteShippingPort", error);
    throw new Error(userFacingDbError(error, "删除港口失败"));
  }
}
