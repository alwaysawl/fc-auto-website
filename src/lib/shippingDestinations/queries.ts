import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  SHIPPING_DESTINATIONS,
  type PortRate,
  type ShippingDestination,
} from "@/data/shippingRates";
import type {
  ShippingCountryInput,
  ShippingCountryRow,
  ShippingCountryWithPorts,
  ShippingPortInput,
  ShippingPortRow,
} from "@/lib/shippingDestinations/types";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapCountry(row: Record<string, unknown>): ShippingCountryRow {
  return {
    id: String(row.id),
    name_en: String(row.name_en ?? ""),
    name_fr: row.name_fr == null ? null : String(row.name_fr),
    name_zh: row.name_zh == null ? null : String(row.name_zh),
    enabled: Boolean(row.enabled),
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
    enabled: Boolean(row.enabled),
    display_order: Number(row.display_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
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

export async function listShippingCountriesWithPorts(options?: {
  enabledOnly?: boolean;
}): Promise<{
  countries: ShippingCountryWithPorts[];
  source: "database" | "static";
  tablesMissing: boolean;
}> {
  const enabledOnly = options?.enabledOnly === true;
  const supabase = getAdminClient();
  if (!supabase) {
    const countries = getStaticShippingCountriesWithPorts();
    return {
      countries: enabledOnly
        ? countries
            .filter((c) => c.enabled)
            .map((c) => ({ ...c, ports: c.ports.filter((p) => p.enabled) }))
        : countries,
      source: "static",
      tablesMissing: true,
    };
  }

  let countryQuery = supabase
    .from("shipping_countries")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name_en", { ascending: true });
  if (enabledOnly) countryQuery = countryQuery.eq("enabled", true);

  const { data: countryData, error: countryError } = await countryQuery;

  if (countryError) {
    if (isMissingRelationError(countryError)) {
      return {
        countries: getStaticShippingCountriesWithPorts(),
        source: "static",
        tablesMissing: true,
      };
    }
    throw new Error(countryError.message);
  }

  let portQuery = supabase
    .from("shipping_ports")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name_en", { ascending: true });
  if (enabledOnly) portQuery = portQuery.eq("enabled", true);

  const { data: portData, error: portError } = await portQuery;

  if (portError) {
    if (isMissingRelationError(portError)) {
      return {
        countries: getStaticShippingCountriesWithPorts(),
        source: "static",
        tablesMissing: true,
      };
    }
    throw new Error(portError.message);
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

  return { countries, source: "database", tablesMissing: false };
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
  const supabase = getAdminClient();
  if (!supabase) throw new Error("缺少 Supabase 配置");

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
    if (isMissingRelationError(error)) {
      throw new Error("运费数据表尚未创建，请先在 Supabase 执行迁移 SQL");
    }
    if (error.code === "23505") throw new Error("国家已存在，请勿重复添加");
    throw new Error(error.message);
  }
  return mapCountry(data as Record<string, unknown>);
}

export async function updateShippingCountry(
  id: string,
  patch: Partial<ShippingCountryInput> & { enabled?: boolean }
): Promise<ShippingCountryRow> {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("缺少 Supabase 配置");

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
    if (isMissingRelationError(error)) {
      throw new Error("运费数据表尚未创建，请先在 Supabase 执行迁移 SQL");
    }
    throw new Error(error.message);
  }
  return mapCountry(data as Record<string, unknown>);
}

export async function deleteShippingCountry(id: string): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("缺少 Supabase 配置");

  const { error } = await supabase.from("shipping_countries").delete().eq("id", id);
  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("运费数据表尚未创建，请先在 Supabase 执行迁移 SQL");
    }
    throw new Error(error.message);
  }
}

export async function createShippingPort(input: ShippingPortInput): Promise<ShippingPortRow> {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("缺少 Supabase 配置");

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
    if (isMissingRelationError(error)) {
      throw new Error("运费数据表尚未创建，请先在 Supabase 执行迁移 SQL");
    }
    if (error.code === "23505") throw new Error("同一国家下港口已存在，请勿重复添加");
    throw new Error(error.message);
  }
  return mapPort(data as Record<string, unknown>);
}

export async function updateShippingPort(
  id: string,
  patch: Partial<ShippingPortInput> & { enabled?: boolean }
): Promise<ShippingPortRow> {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("缺少 Supabase 配置");

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
    if (isMissingRelationError(error)) {
      throw new Error("运费数据表尚未创建，请先在 Supabase 执行迁移 SQL");
    }
    if (error.code === "23505") throw new Error("同一国家下港口已存在，请勿重复添加");
    throw new Error(error.message);
  }
  return mapPort(data as Record<string, unknown>);
}

export async function deleteShippingPort(id: string): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("缺少 Supabase 配置");

  const { error } = await supabase.from("shipping_ports").delete().eq("id", id);
  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("运费数据表尚未创建，请先在 Supabase 执行迁移 SQL");
    }
    throw new Error(error.message);
  }
}
