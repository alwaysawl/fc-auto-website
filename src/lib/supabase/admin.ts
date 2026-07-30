import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return trimmed;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const url = requireEnv("SUPABASE_URL", process.env.SUPABASE_URL);
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY fallback)"
    );
  }

  adminClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}
