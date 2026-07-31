import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let adminClientUrl: string | null = null;

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

/** Safe diagnostics only — never includes key material. */
export type SupabaseProjectDiagnostics = {
  serverProjectRef: string | null;
  publicProjectRef: string | null;
  resolvedProjectRef: string | null;
  urlMismatch: boolean;
  keySource: SupabaseKeySource;
  keyFormat: SupabaseKeyFormat;
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
    // https://PROJECT_REF.supabase.co
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

function readKeyWithSource(): { key: string; source: SupabaseKeySource } {
  const secret = (process.env.SUPABASE_SECRET_KEY ?? "").trim();
  if (secret) return { key: secret, source: "SUPABASE_SECRET_KEY" };

  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (service) return { key: service, source: "SUPABASE_SERVICE_ROLE_KEY" };

  // Admin/data mutations must not silently fall back to anon (RLS → empty rows).
  return { key: "", source: "missing" };
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
 * Privileged server key only (secret / service_role).
 * Does not fall back to anon — that caused empty shipping reads under RLS.
 */
export function getSupabaseSecretKey(): string {
  const { key, source } = readKeyWithSource();
  if (!key) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (source === "missing") {
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

  const { key, source } = readKeyWithSource();
  // Also report if only anon keys exist (without using them for admin)
  const anon =
    (process.env.SUPABASE_ANON_KEY ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const effectiveForFormat = key || anon;
  const keyFormat = detectKeyFormat(effectiveForFormat);
  const claims = key ? peekJwtClaims(key) : { role: null, ref: null };

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
    keyFormat: key ? detectKeyFormat(key) : keyFormat === "missing" ? "missing" : keyFormat,
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
  const key = getSupabaseSecretKey();

  if (adminClient && adminClientUrl === url) {
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
    keyJwtRole: diagnostics.keyJwtRole,
    keyJwtRef: diagnostics.keyJwtRef,
    keyRefMatchesResolvedUrl: diagnostics.keyRefMatchesResolvedUrl,
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
  });
  adminClientUrl = url;

  return adminClient;
}
