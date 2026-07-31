import { NextResponse } from "next/server";
import {
  isAdminAuthConfigured,
  isAdminSessionActive,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isAdminAuthConfigured();
  const authenticated = configured ? await isAdminSessionActive() : false;
  return NextResponse.json({ configured, authenticated });
}
