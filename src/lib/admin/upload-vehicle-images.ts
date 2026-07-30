/**
 * Client-side helper: upload vehicle image Files to Supabase Storage
 * via signed URLs from POST /api/vehicles/upload-url (bucket: vehicle-images).
 */

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 30;

export class VehicleUploadError extends Error {
  code: string;

  constructor(message: string, code = "") {
    super(message);
    this.name = "VehicleUploadError";
    this.code = code;
  }
}

export type UploadProgress = (current: number, total: number) => void;

function isBlobUrl(url: string | undefined): boolean {
  return !!url && url.startsWith("blob:");
}

/** Validate files before upload. Throws VehicleUploadError on failure. */
export function validateVehicleImageFiles(files: File[]): void {
  if (files.length === 0) {
    throw new VehicleUploadError("发布前请至少上传一张图片。");
  }
  if (files.length > MAX_FILES) {
    throw new VehicleUploadError(`最多只能上传 ${MAX_FILES} 张图片。`);
  }
  for (const file of files) {
    if (!ALLOWED_MIME.includes(file.type)) {
      throw new VehicleUploadError(
        `不支持的图片格式（${file.name}），请上传 JPG、PNG 或 WebP。`
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new VehicleUploadError(
        `图片过大（${file.name}），单张最大 10MB。`
      );
    }
  }
}

/**
 * Upload files in order to vehicle-images.
 * Returns public URLs in the same order (never blob: URLs).
 */
export async function uploadVehicleImageFiles(
  files: File[],
  vehicleId: string,
  onProgress?: UploadProgress
): Promise<string[]> {
  validateVehicleImageFiles(files);

  const publicUrls: string[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    onProgress?.(index + 1, files.length);

    const metaRes = await fetch("/api/vehicles/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        vehicleId,
        index,
      }),
    });

    const meta = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      const msg = meta.message || meta.error || "无法生成上传地址";
      const code = meta.code ? String(meta.code) : "";
      throw new VehicleUploadError(
        `发布失败：图片上传失败（${index + 1}/${files.length}）：${msg}${code ? ` [code: ${code}]` : ""}`,
        code
      );
    }

    const { signedUrl, publicUrl, storagePath } = meta as {
      signedUrl: string;
      publicUrl: string;
      storagePath: string;
    };

    if (!signedUrl || !publicUrl) {
      throw new VehicleUploadError(
        `发布失败：图片上传失败（${index + 1}/${files.length}）：服务器未返回上传地址。`
      );
    }

    if (isBlobUrl(publicUrl)) {
      throw new VehicleUploadError(
        `发布失败：图片上传失败（${index + 1}/${files.length}）：返回了无效的预览地址。`
      );
    }

    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
    });

    if (!putRes.ok) {
      let detail = "";
      let code = String(putRes.status);
      try {
        const errBody = await putRes.json();
        detail = errBody?.message || errBody?.error || putRes.statusText;
        if (errBody?.statusCode || errBody?.code) {
          code = String(errBody.statusCode || errBody.code);
        }
      } catch {
        detail = (await putRes.text().catch(() => "")) || putRes.statusText;
      }
      throw new VehicleUploadError(
        `发布失败：图片上传到 Storage 失败（${index + 1}/${files.length}，${storagePath}）：${detail} [code: ${code}]`,
        code
      );
    }

    publicUrls.push(publicUrl);
  }

  return publicUrls;
}
