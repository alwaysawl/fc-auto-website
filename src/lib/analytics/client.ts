"use client";

import {
  getAnalyticsSessionId,
  getAnonymousVisitorId,
} from "@/lib/analytics/ids";
import {
  classifyFirstTouchCapture,
  isTrafficSource,
  type TrafficSource,
} from "@/lib/analytics/source";
import type {
  AnalyticsEventInput,
  AnalyticsEventName,
} from "@/lib/analytics/types";
import { isAnalyticsEventName } from "@/lib/analytics/types";

const MAX_META_KEYS = 20;
const MAX_META_STRING = 120;
const DEDUPE_MS = 800;
const recentKeys = new Map<string, number>();
const FIRST_TOUCH_KEY = "__fc_auto_first_touch_v2";

type FirstTouchSource = TrafficSource;

type FirstTouchAttribution = {
  version: 2;
  source: FirstTouchSource;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrer_host: string | null;
  direct_explicit: boolean;
};

function categorizeUserAgent(ua: string): string {
  const s = ua.toLowerCase();
  if (!s) return "unknown";
  if (
    /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|wget|curl/i.test(
      s
    )
  ) {
    return "bot";
  }
  if (/ipad|tablet|kindle/i.test(s)) return "tablet";
  if (/mobi|iphone|android/i.test(s)) return "mobile";
  return "desktop";
}

function sanitizeMetadata(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  let n = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (n >= MAX_META_KEYS) break;
    const k = key.trim().slice(0, 40);
    if (!k) continue;
    const lower = k.toLowerCase();
    if (
      lower.includes("phone") ||
      lower.includes("email") ||
      lower.includes("vin") ||
      lower === "whatsapp_number" ||
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower === "ip" ||
      lower.includes("ip_address")
    ) {
      continue;
    }
    if (typeof value === "string") {
      out[k] = value.trim().slice(0, MAX_META_STRING);
      n += 1;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[k] = value;
      n += 1;
    } else if (typeof value === "boolean") {
      out[k] = value;
      n += 1;
    }
  }
  return out;
}

function normalizePath(pathname: string): string | null {
  const raw = pathname.trim();
  if (!raw) return null;
  if (raw.startsWith("/admin")) return null;
  if (raw.startsWith("/api")) return null;
  if (raw.startsWith("/_next")) return null;
  // Strip query/hash — never persist potentially private query strings
  const pathOnly = raw.split("?")[0]?.split("#")[0] ?? raw;
  return pathOnly.slice(0, 200) || null;
}

function cleanQueryValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_META_STRING);
}

function classifyFirstTouchSource(input: {
  utm_source: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrer_host: string | null;
}): { source: FirstTouchSource; directExplicit: boolean } {
  return classifyFirstTouchCapture({
    utmSource: input.utm_source,
    fbclid: input.fbclid,
    gclid: input.gclid,
    referrerHost: input.referrer_host,
  });
}

function readStoredAttribution(): FirstTouchAttribution | null {
  try {
    const raw = window.localStorage.getItem(FIRST_TOUCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirstTouchAttribution>;
    if (parsed.version !== 2 || !isTrafficSource(parsed.source)) return null;
    return {
      version: 2,
      source: parsed.source,
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      fbclid: parsed.fbclid ?? null,
      gclid: parsed.gclid ?? null,
      referrer_host: parsed.referrer_host ?? null,
      direct_explicit: Boolean(parsed.direct_explicit),
    };
  } catch {
    return null;
  }
}

function captureAndStoreFirstTouch(referrerHost: string | null): FirstTouchAttribution {
  const params = new URLSearchParams(window.location.search || "");
  const utm_source = cleanQueryValue(params.get("utm_source"));
  const utm_medium = cleanQueryValue(params.get("utm_medium"));
  const utm_campaign = cleanQueryValue(params.get("utm_campaign"));
  const fbclid = cleanQueryValue(params.get("fbclid"));
  const gclid = cleanQueryValue(params.get("gclid"));
  const classified = classifyFirstTouchSource({
    utm_source,
    fbclid,
    gclid,
    referrer_host: referrerHost,
  });

  const payload: FirstTouchAttribution = {
    version: 2,
    source: classified.source,
    utm_source,
    utm_medium,
    utm_campaign,
    fbclid,
    gclid,
    referrer_host: referrerHost,
    direct_explicit: classified.directExplicit,
  };

  try {
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
  return payload;
}

function shouldDedupe(key: string): boolean {
  const now = Date.now();
  const prev = recentKeys.get(key) ?? 0;
  if (now - prev < DEDUPE_MS) return true;
  recentKeys.set(key, now);
  if (recentKeys.size > 200) {
    for (const [k, t] of recentKeys) {
      if (now - t > 10_000) recentKeys.delete(k);
    }
  }
  return false;
}

/**
 * Fire-and-forget analytics. Never throws to the caller.
 * Prefer sendBeacon; fall back to keepalive fetch.
 *
 * Privacy: anonymous visitor/session IDs only (localStorage). No phones, emails,
 * VINs, full IPs, or invasive fingerprinting.
 */
export function trackAnalyticsEvent(
  eventName: AnalyticsEventName | string,
  options?: {
    vehicleId?: string | null;
    countryId?: string | null;
    portId?: string | null;
    cartItemCount?: number | null;
    cartValueUsd?: number | null;
    metadata?: Record<string, unknown> | null;
    pagePath?: string | null;
    locale?: string | null;
    dedupeKey?: string | null;
  }
): void {
  try {
    if (typeof window === "undefined") return;
    if (!isAnalyticsEventName(eventName)) return;

    const pagePath = normalizePath(
      options?.pagePath ?? window.location.pathname
    );
    if (
      (eventName === "page_view" || eventName === "vehicle_detail_view") &&
      !pagePath
    ) {
      return;
    }

    const dedupe =
      options?.dedupeKey ??
      `${eventName}|${pagePath ?? ""}|${options?.vehicleId ?? ""}`;
    if (shouldDedupe(dedupe)) return;

    const ua = navigator.userAgent || "";
    const category = categorizeUserAgent(ua);
    if (category === "bot") return;

    let referrerHost: string | null = null;
    try {
      if (document.referrer) {
        referrerHost = new URL(document.referrer).host.slice(0, 120);
      }
    } catch {
      referrerHost = null;
    }
    const firstTouch =
      readStoredAttribution() ?? captureAndStoreFirstTouch(referrerHost);

    // Prefer locale from path when not provided
    let locale = options?.locale?.trim().slice(0, 8) || null;
    if (!locale && pagePath) {
      const first = pagePath.split("/").filter(Boolean)[0];
      if (first && /^[a-z]{2}$/i.test(first)) locale = first.toLowerCase();
    }

    const payload: AnalyticsEventInput = {
      event_name: eventName,
      session_id: getAnalyticsSessionId(),
      anonymous_visitor_id: getAnonymousVisitorId(),
      locale,
      page_path: pagePath,
      referrer_host: referrerHost,
      vehicle_id: options?.vehicleId?.trim().slice(0, 80) || null,
      country_id: options?.countryId?.trim().slice(0, 16) || null,
      port_id: options?.portId?.trim().slice(0, 64) || null,
      cart_item_count:
        typeof options?.cartItemCount === "number" &&
        Number.isFinite(options.cartItemCount)
          ? Math.max(0, Math.floor(options.cartItemCount))
          : null,
      cart_value_usd:
        typeof options?.cartValueUsd === "number" &&
        Number.isFinite(options.cartValueUsd) &&
        options.cartValueUsd >= 0
          ? Math.round(options.cartValueUsd * 100) / 100
          : null,
      metadata: sanitizeMetadata({
        attribution_version: firstTouch.version,
        first_touch_source: firstTouch.source,
        first_touch_direct: firstTouch.direct_explicit,
        utm_source: firstTouch.utm_source,
        utm_medium: firstTouch.utm_medium,
        utm_campaign: firstTouch.utm_campaign,
        fbclid: firstTouch.fbclid,
        gclid: firstTouch.gclid,
        first_touch_referrer_host: firstTouch.referrer_host,
        ...(options?.metadata ?? {}),
      }),
      user_agent_category: category,
    };

    const body = JSON.stringify(payload);
    const url = "/api/analytics/events";

    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    }).catch(() => {
      // never break UX
    });
  } catch {
    // never break UX
  }
}
