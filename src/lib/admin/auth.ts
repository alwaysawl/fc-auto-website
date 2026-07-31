import "server-only";

import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "fc_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function getSigningKey(): string {
  return (
    (process.env.ADMIN_SESSION_SECRET ?? "").trim() ||
    (process.env.ADMIN_API_SECRET ?? "").trim() ||
    (process.env.SUPABASE_SECRET_KEY ?? "").trim() ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim() ||
    ""
  );
}

export function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? "").trim();
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getSigningKey() && getAdminPassword());
}

function signPayload(payload: string): string {
  const key = getSigningKey();
  if (!key) throw new Error("Admin session signing key is not configured");
  return createHmac("sha256", key).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Create a signed admin session token (expiresAtMs.signature). */
export function createAdminSessionToken(now = Date.now()): string {
  const expiresAt = now + SESSION_TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `admin:${expiresAt}:${nonce}`;
  return `${payload}.${signPayload(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || !getSigningKey()) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!payload.startsWith("admin:") || !signature) return false;

  const expected = signPayload(payload);
  if (!safeEqual(signature, expected)) return false;

  const parts = payload.split(":");
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  return safeEqual(password, expected);
}

export function verifyAdminBearer(request: Request): boolean {
  const secret =
    (process.env.ADMIN_API_SECRET ?? "").trim() ||
    (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return false;
  return safeEqual(match[1].trim(), secret);
}

export async function readAdminSessionCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function isAdminSessionActive(): Promise<boolean> {
  if (!isAdminAuthConfigured()) return false;
  return verifyAdminSessionToken(await readAdminSessionCookie());
}

/**
 * Protect admin vehicle APIs.
 * Returns null when authorized; otherwise a 401/403/503 JSON response.
 */
export async function requireAdminApi(
  request: Request
): Promise<NextResponse | null> {
  if (!getSigningKey()) {
    return NextResponse.json(
      {
        error: "管理员鉴权未配置：缺少会话签名密钥",
        code: "ADMIN_AUTH_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  if (!getAdminPassword() && !((process.env.ADMIN_API_SECRET ?? "").trim())) {
    return NextResponse.json(
      {
        error: "管理员鉴权未配置：请设置 ADMIN_PASSWORD（或 ADMIN_API_SECRET）",
        code: "ADMIN_AUTH_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  if (verifyAdminBearer(request)) {
    return null;
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`)
  );
  const cookieToken = cookieMatch?.[1]
    ? decodeURIComponent(cookieMatch[1])
    : undefined;

  if (verifyAdminSessionToken(cookieToken)) {
    return null;
  }

  return NextResponse.json(
    { error: "未授权：请先登录管理后台", code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export function adminSessionCookieOptions(token: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
