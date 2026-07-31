import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  adminSessionCookieOptions,
  isAdminAuthConfigured,
  verifyAdminPassword,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    const { getAdminAuthDiagnostics } = await import("@/lib/admin/auth");
    return NextResponse.json(
      {
        error:
          "管理员登录未配置。请在服务器环境变量中设置 ADMIN_PASSWORD，并确保存在可用的会话签名密钥（ADMIN_SESSION_SECRET 或现有 SUPABASE_SECRET_KEY）。",
        code: "ADMIN_AUTH_NOT_CONFIGURED",
        ...getAdminAuthDiagnostics(),
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效的请求格式" }, { status: 400 });
  }

  const password =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json(
      { error: "密码错误", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminSessionCookieOptions(token));
  return response;
}
