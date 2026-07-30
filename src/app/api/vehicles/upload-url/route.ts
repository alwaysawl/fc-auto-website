import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "vehicle-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "无效的请求格式", message: "无效的请求格式", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).filename !== "string" ||
    typeof (body as Record<string, unknown>).mimeType !== "string" ||
    typeof (body as Record<string, unknown>).fileSize !== "number"
  ) {
    return NextResponse.json(
      {
        error: "请求参数缺失：filename、mimeType、fileSize 为必填项",
        message: "请求参数缺失：filename、mimeType、fileSize 为必填项",
        code: "MISSING_PARAMS",
      },
      { status: 400 }
    );
  }

  const { filename, mimeType, fileSize, vehicleId, index } = body as {
    filename: string;
    mimeType: string;
    fileSize: number;
    vehicleId?: string;
    index?: number;
  };

  if (!ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json(
      {
        error: "不支持的图片格式，请上传 JPG、PNG 或 WebP",
        message: "不支持的图片格式，请上传 JPG、PNG 或 WebP",
        code: "INVALID_MIME",
      },
      { status: 400 }
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: "图片大小超过限制（最大 10MB）",
        message: "图片大小超过限制（最大 10MB）",
        code: "FILE_TOO_LARGE",
      },
      { status: 400 }
    );
  }

  if (!vehicleId?.trim()) {
    return NextResponse.json(
      {
        error: "缺少车辆编号，无法生成上传路径",
        message: "缺少车辆编号，无法生成上传路径",
        code: "MISSING_VEHICLE_ID",
      },
      { status: 400 }
    );
  }

  const ext =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const timestamp = Date.now();
  const imageIndex = typeof index === "number" && index >= 0 ? index : 0;
  const baseName = sanitizeFilename(filename.replace(/\.[^.]+$/, "")) || "image";
  const safeVehicleId = sanitizeFilename(vehicleId) || "vehicle";
  // vehicles/{vehicleId}/{timestamp}-{index}-{sanitizedFilename}
  const storagePath = `vehicles/${safeVehicleId}/${timestamp}-${imageIndex}-${baseName}.${ext}`;

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "服务器配置错误";
    return NextResponse.json(
      { error: message, message, code: "MISSING_ENV" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    const message = error?.message || "无法生成上传地址";
    const code =
      (error as { statusCode?: string; code?: string } | null)?.statusCode ||
      (error as { statusCode?: string; code?: string } | null)?.code ||
      "SIGNED_URL_FAILED";
    console.error("[upload-url] createSignedUploadUrl error:", message, code);
    return NextResponse.json(
      {
        error: `无法生成上传地址：${message} [code: ${code}]`,
        message,
        code,
        bucket: BUCKET,
      },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
    publicUrl,
    bucket: BUCKET,
  });
}
