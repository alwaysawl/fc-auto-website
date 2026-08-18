/**
 * Shared traffic-source classification for first-touch capture and the
 * admin statistics dashboard. Safe to import from client and server.
 *
 * Historical rows are never rewritten. Missing referrer / click ids stay
 * unknown unless first-touch v2 explicitly marked a visit as direct.
 */

export const TRAFFIC_SOURCE_IDS = [
  "facebook",
  "instagram",
  "google",
  "tiktok",
  "whatsapp",
  "direct",
  "other",
  "unknown",
] as const;

export type TrafficSource = (typeof TRAFFIC_SOURCE_IDS)[number];

export type TrafficSourceFilter = "all" | TrafficSource;

export function isTrafficSource(value: unknown): value is TrafficSource {
  return (
    typeof value === "string" &&
    (TRAFFIC_SOURCE_IDS as readonly string[]).includes(value)
  );
}

export function parseTrafficSourceFilter(
  value: string | null | undefined
): TrafficSourceFilter {
  if (value === "all") return "all";
  if (isTrafficSource(value)) return value;
  return "all";
}

export function trafficSourceLabel(source: TrafficSource): string {
  switch (source) {
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "google":
      return "Google";
    case "tiktok":
      return "TikTok";
    case "whatsapp":
      return "WhatsApp";
    case "direct":
      return "直接访问";
    case "other":
      return "其他来源";
    case "unknown":
      return "未知来源";
  }
}

function asLower(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function inferNamedSource(input: {
  utm: string;
  fbclid: string;
  gclid: string;
  hosts: string[];
}): TrafficSource | null {
  const { utm, fbclid, gclid, hosts } = input;

  if (utm.includes("facebook") || utm === "fb" || utm.includes("meta")) {
    return "facebook";
  }
  if (utm.includes("instagram") || utm === "ig") return "instagram";
  if (utm.includes("tiktok") || utm === "tt") return "tiktok";
  if (utm.includes("whatsapp") || utm === "wa") return "whatsapp";
  if (utm.includes("google")) return "google";
  if (fbclid) return "facebook";
  if (gclid) return "google";

  for (const raw of hosts) {
    const host = asLower(raw);
    if (!host) continue;
    if (
      host.includes("facebook.com") ||
      host === "fb.com" ||
      host.endsWith(".fb.com") ||
      host === "fb.me" ||
      host.endsWith(".fb.me")
    ) {
      return "facebook";
    }
    if (
      host.includes("instagram.com") ||
      host === "ig.me" ||
      host.endsWith(".ig.me")
    ) {
      return "instagram";
    }
    if (
      host.includes("tiktok.com") ||
      host.includes("douyin.com") ||
      host.includes("tiktokv.com")
    ) {
      return "tiktok";
    }
    if (
      host.includes("whatsapp.com") ||
      host === "wa.me" ||
      host.endsWith(".wa.me") ||
      host === "l.wl.co" ||
      host.endsWith(".wl.co")
    ) {
      return "whatsapp";
    }
    if (host.includes("google.") || host.includes("googlequicksearchbox")) {
      return "google";
    }
  }

  return null;
}

export function classifyTrafficSource(input: {
  utmSource?: unknown;
  fbclid?: unknown;
  gclid?: unknown;
  referrerHost?: unknown;
  firstTouchSource?: unknown;
  firstTouchDirect?: unknown;
  firstTouchReferrerHost?: unknown;
  attributionVersion?: unknown;
}): TrafficSource {
  const utm = asLower(input.utmSource);
  const fbclid = asLower(input.fbclid);
  const gclid = asLower(input.gclid);
  const referrerHost = asLower(input.referrerHost);
  const firstTouchReferrerHost = asLower(input.firstTouchReferrerHost);
  const firstTouch = asLower(input.firstTouchSource);
  const attributionVersion = Number(input.attributionVersion ?? 0);
  const firstTouchDirect = Boolean(input.firstTouchDirect);

  const named = inferNamedSource({
    utm,
    fbclid,
    gclid,
    hosts: [referrerHost, firstTouchReferrerHost],
  });
  if (named) return named;

  if (
    firstTouch === "facebook" ||
    firstTouch === "instagram" ||
    firstTouch === "google" ||
    firstTouch === "tiktok" ||
    firstTouch === "whatsapp"
  ) {
    return firstTouch;
  }

  if (firstTouch === "direct" || (attributionVersion >= 2 && firstTouchDirect)) {
    return "direct";
  }

  if (firstTouch === "other") return "other";
  if (firstTouch === "unknown") return "unknown";

  if (referrerHost) return "other";
  return "unknown";
}

/** First landing classification for new visits (attribution v2). */
export function classifyFirstTouchCapture(input: {
  utmSource?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  referrerHost?: string | null;
}): { source: TrafficSource; directExplicit: boolean } {
  const utm = asLower(input.utmSource);
  const fbclid = asLower(input.fbclid);
  const gclid = asLower(input.gclid);
  const referrerHost = asLower(input.referrerHost);

  const named = inferNamedSource({
    utm,
    fbclid,
    gclid,
    hosts: [referrerHost],
  });
  if (named) {
    return { source: named, directExplicit: false };
  }
  if (referrerHost) {
    return { source: "other", directExplicit: false };
  }
  if (!utm && !fbclid && !gclid) {
    return { source: "direct", directExplicit: true };
  }
  return { source: "unknown", directExplicit: false };
}
