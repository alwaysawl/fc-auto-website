import type { NextConfig } from "next";

function supabaseHostname(): string | null {
  const url = process.env.SUPABASE_URL?.trim();
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
