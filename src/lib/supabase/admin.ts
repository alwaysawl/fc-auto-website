import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let adminClientCacheKey: string | null = null;

export type SupabaseKeySource =
  | "SUPABASE_SECRET_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "missing";

export type SupabaseKeyFormat =
  | "jwt"
  | "sb_secret"
  | "sb_publishable"
  | "other"
  | "missing";

/** Compact key type for admin UI diagnostics. */
export type SupabaseKeyTypeUsed = "secret" | "service-role" | "anon" | "missing";

/** Safe diagnostics only — never includes key material. */
export type SupabaseProjectDiagnostics = {
  serverProjectRef: string | null;
  publicProjectRef: string | null;
  resolvedProjectRef: string | null;
  urlMismatch: boolean;
  keySource: SupabaseKeySource;
  keyFormat: SupabaseKeyFormat;
  keyTypeUsed: SupabaseKeyTypeUsed;
  keyJwtRole: string | null;
  keyJwtRef: string | null;
  keyRefMatchesResolvedUrl: boolean | null;
  hasSupabaseUrl: boolean;
  hasPublicSupabaseUrl: boolean;
  hasSecretKey: boolean;
  hasServiceRoleKey: boolean;
  hasAnonKey: boolean;
  hasPublicAnonKey: boolean;
};

export function extractSupabaseProjectRef(url: string | null | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    if (!host) return null;
    if (host.endsWith(".supabase.co")) {
      const ref = host.split(".")[0];
      return ref || null;
    }
    return host;
  } catch {
    return null;
  }
}

function peekJwtClaims(token: string): { role: string | null; ref: string | null } {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return { role: null, ref: null };
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string; ref?: string };
    return {
      role: typeof payload.role === "string" ? payload.role : null,
      ref: typeof payload.ref === "string" ? payload.ref : null,
    };
  } catch {
    return { role: null, ref: null };
  }
}

function detectKeyFormat(key: string): SupabaseKeyFormat {
  if (!key) return "missing";
  if (key.startsWith("sb_secret")) return "sb_secret";
  if (key.startsWith("sb_publishable")) return "sb_publishable";
  if (key.split(".").length === 3) return "jwt";
  return "other";
}

function isPrivilegedAdminKey(key: string): boolean {
  const format = detectKeyFormat(key);
  if (format === "sb_secret") return true;
  if (format === "jwt") {
    const role = peekJwtClaims(key).role;
    return role === "service_role";
  }
  return false;
}

function isAnonLikeKey(key: string): boolean {
  const format = detectKeyFormat(key);
  if (format === "sb_publishable") return true;
  if (format === "jwt") {
    const role = peekJwtClaims(key).role;
    return role === "anon" || role === "authenticated";
  }
  return false;
}

function keyTypeUsedFrom(key: string, source: SupabaseKeySource): SupabaseKeyTypeUsed {
  if (!key || source === "missing") return "missing";
  const format = detectKeyFormat(key);
  if (format === "sb_secret") return "secret";
  if (format === "jwt" && peekJwtClaims(key).role === "service_role") {
    return "service-role";
  }
  if (isAnonLikeKey(key)) return "anon";
  if (source === "SUPABASE_SERVICE_ROLE_KEY") return "service-role";
  if (source === "SUPABASE_SECRET_KEY") return "secret";
  return "anon";
}

/**
 * Pick a privileged server key.
 * Skips anon/publishable values even if mis-filed under SUPABASE_SECRET_KEY.
 */
function readPrivilegedKeyWithSource(): { key: string; source: SupabaseKeySource } {
  const candidates: { key: string; source: SupabaseKeySource }[] = [
    {
      key: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
      source: "SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      key: (process.env.SUPABASE_SECRET_KEY ?? "").trim(),
      source: "SUPABASE_SECRET_KEY",
    },
  ];

  // Prefer an explicitly privileged key (service_role JWT or sb_secret)
  for (const candidate of candidates) {
    if (candidate.key && isPrivilegedAdminKey(candidate.key)) {
      return candidate;
    }
  }

  // Accept non-empty secret/service env if not clearly anon-like
  for (const candidate of candidates) {
    if (candidate.key && !isAnonLikeKey(candidate.key)) {
      return candidate;
    }
  }

  return { key: "", source: "missing" };
}

/**
 * New publishable/secret keys are NOT JWTs. supabase-js still sets
 * Authorization: Bearer <key> by default; PostgREST then fails JWT parsing
 * and the request runs as anon → RLS returns empty rows (no error).
 * Strip non-JWT Authorization and keep apikey only.
 */
function createAdminFetch(apiKey: string): typeof fetch {
  const keyFormat = detectKeyFormat(apiKey);
  const mustStripBearer = keyFormat === "sb_secret" || keyFormat === "sb_publishable";

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (!headers.has("apikey")) {
      headers.set("apikey", apiKey);
    }

    if (mustStripBearer) {
      const auth = headers.get("Authorization");
      if (auth) {
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (
          token === apiKey ||
          token.startsWith("sb_secret") ||
          token.startsWith("sb_publishable")
        ) {
          headers.delete("Authorization");
        }
      }
    }

    return fetch(input, { ...init, headers });
  };
}

/**
 * Resolve the Supabase project URL used by all server admin queries.
 * When SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL point at different projects,
 * prefer the public website project (NEXT_PUBLIC) and log the mismatch.
 */
export function getSupabaseUrl(): string {
  const serverUrl = (process.env.SUPABASE_URL ?? "").trim();
  const publicUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serverRef = extractSupabaseProjectRef(serverUrl);
  const publicRef = extractSupabaseProjectRef(publicUrl);

  if (serverUrl && publicUrl && serverRef && publicRef && serverRef !== publicRef) {
    console.error("[supabase] URL project mismatch — using public website project", {
      serverProjectRef: serverRef,
      publicProjectRef: publicRef,
      resolvedFrom: "NEXT_PUBLIC_SUPABASE_URL",
    });
    return publicUrl;
  }

  const url = serverUrl || publicUrl;
  if (!url) {
    throw new Error(
      "Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    (process.env.SUPABASE_ANON_KEY ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!key) {
    throw new Error(
      "Missing required environment variable: SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return key;
}

/**
 * Privileged server key only (sb_secret or service_role JWT).
 * Does not fall back to anon/publishable.
 */
export function getSupabaseSecretKey(): string {
  const { key, source } = readPrivilegedKeyWithSource();
  if (!key || source === "missing") {
    throw new Error(
      "Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return key;
}

export function getSupabaseProjectDiagnostics(): SupabaseProjectDiagnostics {
  const serverUrl = (process.env.SUPABASE_URL ?? "").trim();
  const publicUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serverProjectRef = extractSupabaseProjectRef(serverUrl);
  const publicProjectRef = extractSupabaseProjectRef(publicUrl);

  let resolvedProjectRef: string | null = null;
  try {
    resolvedProjectRef = extractSupabaseProjectRef(getSupabaseUrl());
  } catch {
    resolvedProjectRef = serverProjectRef || publicProjectRef;
  }

  const { key, source } = readPrivilegedKeyWithSource();
  const claims = key ? peekJwtClaims(key) : { role: null, ref: null };
  const keyFormat = key ? detectKeyFormat(key) : "missing";

  let keyRefMatchesResolvedUrl: boolean | null = null;
  if (claims.ref && resolvedProjectRef) {
    keyRefMatchesResolvedUrl = claims.ref === resolvedProjectRef;
  }

  return {
    serverProjectRef,
    publicProjectRef,
    resolvedProjectRef,
    urlMismatch: Boolean(
      serverProjectRef && publicProjectRef && serverProjectRef !== publicProjectRef
    ),
    keySource: source,
    keyFormat,
    keyTypeUsed: keyTypeUsedFrom(key, source),
    keyJwtRole: claims.role,
    keyJwtRef: claims.ref,
    keyRefMatchesResolvedUrl,
    hasSupabaseUrl: Boolean(serverUrl),
    hasPublicSupabaseUrl: Boolean(publicUrl),
    hasSecretKey: Boolean((process.env.SUPABASE_SECRET_KEY ?? "").trim()),
    hasServiceRoleKey: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()),
    hasAnonKey: Boolean((process.env.SUPABASE_ANON_KEY ?? "").trim()),
    hasPublicAnonKey: Boolean((process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim()),
  };
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = getSupabaseUrl();
  const { key, source } = readPrivilegedKeyWithSource();
  if (!key || source === "missing") {
    throw new Error(
      "Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const cacheKey = `${url}::${source}::${detectKeyFormat(key)}`;
  if (adminClient && adminClientCacheKey === cacheKey) {
    return adminClient;
  }

  const diagnostics = getSupabaseProjectDiagnostics();
  console.info("[supabase] admin client init", {
    resolvedProjectRef: diagnostics.resolvedProjectRef,
    serverProjectRef: diagnostics.serverProjectRef,
    publicProjectRef: diagnostics.publicProjectRef,
    urlMismatch: diagnostics.urlMismatch,
    keySource: diagnostics.keySource,
    keyFormat: diagnostics.keyFormat,
    keyTypeUsed: diagnostics.keyTypeUsed,
    keyJwtRole: diagnostics.keyJwtRole,
    keyJwtRef: diagnostics.keyJwtRef,
    keyRefMatchesResolvedUrl: diagnostics.keyRefMatchesResolvedUrl,
    stripsBearerForNewApiKey:
      diagnostics.keyFormat === "sb_secret" ||
      diagnostics.keyFormat === "sb_publishable",
  });

  if (diagnostics.keyRefMatchesResolvedUrl === false) {
    console.error(
      "[supabase] Secret key JWT ref does not match resolved Supabase URL project",
      {
        keyJwtRef: diagnostics.keyJwtRef,
        resolvedProjectRef: diagnostics.resolvedProjectRef,
      }
    );
  }

  adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createAdminFetch(key),
    },
  });
  adminClientCacheKey = cacheKey;

  return adminClient;
}
