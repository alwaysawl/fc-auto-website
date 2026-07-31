/**
 * Browser-side anonymous visitor + session IDs (localStorage only).
 * Not derived from phone, email, IP, or fingerprint.
 */

const VISITOR_KEY = "fc_analytics_vid_v1";
const SESSION_KEY = "fc_analytics_sid_v1";
const SESSION_TOUCH_KEY = "fc_analytics_sid_touch_v1";
const SESSION_TTL_MS = 30 * 60 * 1000;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

export function getAnonymousVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = read(VISITOR_KEY);
  if (!id) {
    id = randomId();
    write(VISITOR_KEY, id);
  }
  return id;
}

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  const now = Date.now();
  const touchRaw = read(SESSION_TOUCH_KEY);
  const touch = touchRaw ? Number(touchRaw) : 0;
  let sid = read(SESSION_KEY);

  if (!sid || !Number.isFinite(touch) || now - touch > SESSION_TTL_MS) {
    sid = randomId();
    write(SESSION_KEY, sid);
  }
  write(SESSION_TOUCH_KEY, String(now));
  return sid;
}
