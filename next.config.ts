import type { NextConfig } from "next";

function supabaseHostname(): string | null {
  const url =
    (process.env.SUPABASE_URL ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  // Allow production builds while pre-existing lint debt is cleaned up separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Bundle Noto Sans SC into serverless functions that generate Proforma PDFs.
   * public/ is served as static CDN assets and is NOT present under /var/task by default.
   */
  outputFileTracingIncludes: {
    "/api/admin/proforma-invoices/*/pdf": [
      "./public/fonts/NotoSansSC-Regular.ttf",
      "./public/fonts/NotoSansSC-Bold.ttf",
    ],
    "/api/admin/proforma-invoices/[id]/pdf": [
      "./public/fonts/NotoSansSC-Regular.ttf",
      "./public/fonts/NotoSansSC-Bold.ttf",
    ],
  },
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
