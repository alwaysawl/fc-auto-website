import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isAnalyticsEventName,
  type AnalyticsEventInput,
  type AnalyticsEventName,
} from "@/lib/analytics/types";

const MAX_META_BYTES = 1500;

/** Soft in-process rate limit: max events per visitor per minute. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const rateBuckets = new Map<string, number[]>();

function softRateLimit(visitorId: string | null | undefined): boolean {
  const key = visitorId?.trim() || "anonymous";
  const now = Date.now();
  const prev = (rateBuckets.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX) {
    rateBuckets.set(key, prev);
    return false;
  }
  prev.push(now);
  rateBuckets.set(key, prev);
  if (rateBuckets.size > 5000) {
    for (const [k, times] of rateBuckets) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return true;
}

function cleanString(
  value: unknown,
  max: number
): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v.slice(0, max);
}

function cleanNumber(value: unknown, opts?: { int?: boolean; min?: number }): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (opts?.min != null && n < opts.min) return null;
  return opts?.int ? Math.floor(n) : n;
}

function sanitizeMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  let bytes = 2;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const k = key.trim().slice(0, 40);
    if (!k) continue;
    const lower = k.toLowerCase();
    if (
      lower.includes("phone") ||
      lower.includes("email") ||
      lower.includes("vin") ||
      lower.includes("whatsapp_number") ||
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower === "ip" ||
      lower.includes("ip_address")
    ) {
      continue;
    }
    let next: unknown = null;
    if (typeof value === "string") next = value.trim().slice(0, 120);
    else if (typeof value === "number" && Number.isFinite(value)) next = value;
    else if (typeof value === "boolean") next = value;
    else continue;
    const piece = JSON.stringify({ [k]: next });
    if (bytes + piece.length > MAX_META_BYTES) break;
    out[k] = next;
    bytes += piece.length;
  }
  return out;
}

export type ValidatedAnalyticsEvent = {
  event_name: AnalyticsEventName;
  session_id: string | null;
  anonymous_visitor_id: string | null;
  locale: string | null;
  page_path: string | null;
  referrer_host: string | null;
  vehicle_id: string | null;
  country_id: string | null;
  port_id: string | null;
  cart_item_count: number | null;
  cart_value_usd: number | null;
  metadata: Record<string, unknown>;
  user_agent_category: string | null;
};

export function validateAnalyticsEvent(
  body: unknown
): { ok: true; event: ValidatedAnalyticsEvent } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_body" };
  }
  const raw = body as AnalyticsEventInput;
  if (!isAnalyticsEventName(raw.event_name)) {
    return { ok: false, error: "invalid_event_name" };
  }

  const page_path = cleanString(raw.page_path, 200);
  if (
    page_path &&
    (page_path.startsWith("/admin") ||
      page_path.startsWith("/api") ||
      page_path.startsWith("/_next"))
  ) {
    return { ok: false, error: "excluded_path" };
  }

  const event: ValidatedAnalyticsEvent = {
    event_name: raw.event_name,
    session_id: cleanString(raw.session_id, 80),
    anonymous_visitor_id: cleanString(raw.anonymous_visitor_id, 80),
    locale: cleanString(raw.locale, 8),
    page_path,
    referrer_host: cleanString(raw.referrer_host, 120),
    vehicle_id: cleanString(raw.vehicle_id, 80),
    country_id: cleanString(raw.country_id, 16),
    port_id: cleanString(raw.port_id, 64),
    cart_item_count: cleanNumber(raw.cart_item_count, { int: true, min: 0 }),
    cart_value_usd: cleanNumber(raw.cart_value_usd, { min: 0 }),
    metadata: sanitizeMetadata(raw.metadata),
    user_agent_category: cleanString(raw.user_agent_category, 32),
  };

  if (event.user_agent_category === "bot") {
    return { ok: false, error: "bot_excluded" };
  }

  if (!softRateLimit(event.anonymous_visitor_id)) {
    return { ok: false, error: "rate_limited" };
  }

  return { ok: true, event };
}

export async function insertAnalyticsEvent(
  event: ValidatedAnalyticsEvent
): Promise<{ ok: boolean }> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("analytics_events").insert({
      event_name: event.event_name,
      session_id: event.session_id,
      anonymous_visitor_id: event.anonymous_visitor_id,
      locale: event.locale,
      page_path: event.page_path,
      referrer_host: event.referrer_host,
      vehicle_id: event.vehicle_id,
      country_id: event.country_id,
      port_id: event.port_id,
      cart_item_count: event.cart_item_count,
      cart_value_usd: event.cart_value_usd,
      metadata: event.metadata,
      user_agent_category: event.user_agent_category,
    });
    if (error) {
      console.error("[analytics.insert]", error.code ?? "", String(error.message).slice(0, 160));
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(
      "[analytics.insert]",
      err instanceof Error ? err.message.slice(0, 160) : "unknown"
    );
    return { ok: false };
  }
}
