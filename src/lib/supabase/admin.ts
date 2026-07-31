import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const adminClientCache = new Map<string, SupabaseClient>();

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

export type PrivilegedKeyCandidate = {
  key: string;
  source: SupabaseKeySource;
  format: SupabaseKeyFormat;
  typeUsed: SupabaseKeyTypeUsed;
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
    return peekJwtClaims(key).role === "service_role";
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
 * Ordered privileged key candidates.
 * Prefer sb_secret first (new API keys), then service_role JWT.
 * A disabled/broken legacy SERVICE_ROLE_KEY must not shadow a working SECRET.
 */
export function listPrivilegedKeyCandidates(): PrivilegedKeyCandidate[] {
  const raw: { key: string; source: SupabaseKeySource }[] = [
    {
      key: (process.env.SUPABASE_SECRET_KEY ?? "").trim(),
      source: "SUPABASE_SECRET_KEY",
    },
    {
      key: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
      source: "SUPABASE_SERVICE_ROLE_KEY",
    },
  ];

  const seen = new Set<string>();
  const out: PrivilegedKeyCandidate[] = [];

  const push = (candidate: { key: string; source: SupabaseKeySource }) => {
    if (!candidate.key || seen.has(candidate.source)) return;
    if (isAnonLikeKey(candidate.key)) return;
    seen.add(candidate.source);
    out.push({
      key: candidate.key,
      source: candidate.source,
      format: detectKeyFormat(candidate.key),
      typeUsed: keyTypeUsedFrom(candidate.key, candidate.source),
    });
  };

  for (const candidate of raw) {
    if (candidate.key && detectKeyFormat(candidate.key) === "sb_secret") {
      push(candidate);
    }
  }
  for (const candidate of raw) {
    if (candidate.key && isPrivilegedAdminKey(candidate.key)) {
      push(candidate);
    }
  }
  for (const candidate of raw) {
    if (candidate.key && !isAnonLikeKey(candidate.key)) {
      push(candidate);
    }
  }

  return out;
}

function readPrivilegedKeyWithSource(): { key: string; source: SupabaseKeySource } {
  const first = listPrivilegedKeyCandidates()[0];
  if (!first) return { key: "", source: "missing" };
  return { key: first.key, source: first.source };
}

/**
 * New publishable/secret keys are NOT JWTs. supabase-js still sets
 * Authorization: Bearer <key> by default; PostgREST may treat the request as
 * anon → RLS returns empty rows (no error) on shipping tables that only allow
 * service_role. Strip non-JWT Authorization and keep apikey only.
 *
 * Also merge headers from Request objects (not only init.headers).
 */
function createAdminFetch(apiKey: string): typeof fetch {
  const keyFormat = detectKeyFormat(apiKey);
  const mustStripBearer = keyFormat === "sb_secret" || keyFormat === "sb_publishable";

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const headers = new Headers(request?.headers);
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => {
        headers.set(key, value);
      });
    }

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

    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? request?.method ?? "GET";

    return fetch(url, {
      ...init,
      method,
      headers,
      // Avoid reusing a locked Request body stream when we rebuild the call.
      body:
        init?.body !== undefined
          ? init.body
          : method === "GET" || method === "HEAD"
            ? undefined
            : request?.body ?? undefined,
    });
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

export function getSupabaseProjectDiagnostics(
  preferredSource?: SupabaseKeySource
): SupabaseProjectDiagnostics {
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

  const candidates = listPrivilegedKeyCandidates();
  const selected =
    (preferredSource
      ? candidates.find((c) => c.source === preferredSource)
      : undefined) ?? candidates[0];
  const key = selected?.key ?? "";
  const source = selected?.source ?? "missing";
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

export function createSupabaseAdminWithKey(
  key: string,
  source: SupabaseKeySource
): SupabaseClient {
  const url = getSupabaseUrl();
  const cacheKey = `${url}::${source}::${detectKeyFormat(key)}`;
  const cached = adminClientCache.get(cacheKey);
  if (cached) return cached;

  const diagnostics = getSupabaseProjectDiagnostics(source);
  console.info("[supabase] admin client init", {
    resolvedProjectRef: diagnostics.resolvedProjectRef,
    keySource: source,
    keyFormat: detectKeyFormat(key),
    keyTypeUsed: keyTypeUsedFrom(key, source),
    keyJwtRole: peekJwtClaims(key).role,
    keyJwtRef: peekJwtClaims(key).ref,
    keyRefMatchesResolvedUrl: diagnostics.keyRefMatchesResolvedUrl,
    stripsBearerForNewApiKey:
      detectKeyFormat(key) === "sb_secret" ||
      detectKeyFormat(key) === "sb_publishable",
  });

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createAdminFetch(key),
    },
  });
  adminClientCache.set(cacheKey, client);
  return client;
}

export function getSupabaseAdmin(): SupabaseClient {
  const { key, source } = readPrivilegedKeyWithSource();
  if (!key || source === "missing") {
    throw new Error(
      "Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createSupabaseAdminWithKey(key, source);
}
