import { NextResponse } from "next/server";
import {
  getAdminAuthDiagnostics,
  isAdminAuthConfigured,
  isAdminSessionActive,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe auth diagnostics for /admin.
 * Never returns secret values — only configured booleans.
 */
export async function GET() {
  const diagnostics = getAdminAuthDiagnostics();
  const configured = isAdminAuthConfigured();
  const authenticated = configured ? await isAdminSessionActive() : false;

  return NextResponse.json({
    adminPasswordConfigured: diagnostics.adminPasswordConfigured,
    sessionSecretConfigured: diagnostics.sessionSecretConfigured,
    configured,
    authenticated,
  });
}
