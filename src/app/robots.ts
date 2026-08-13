import type { MetadataRoute } from "next";
import { SITE_URL, getSiteUrl } from "@/lib/seo";

/**
 * Public crawler policy for https://fcautoexport.com/robots.txt
 * - Allow all public storefront pages (home, inventory, vehicle details, etc.)
 * - Do not block /_next, images, CSS, or JS needed for rendering
 * - Block only real internal routes that exist in this app
 */
export default function robots(): MetadataRoute.Robots {
  // Prefer hardened getSiteUrl(); SITE_URL is the guaranteed production fallback.
  const site = getSiteUrl() || SITE_URL;
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Admin UI + login (served under /admin when unauthenticated)
          "/admin",
          "/admin/",
          // App Router API routes
          "/api/",
          // Locale-prefixed private / non-indexable storefront tools
          "/*/cart",
          "/*/cart/",
          "/*/test-upload",
          "/*/test-upload/",
          "/*/shipping-calculator",
          "/*/shipping-calculator/",
        ],
      },
    ],
    sitemap: sitemapUrl,
    host: site.replace(/^https?:\/\//, ""),
  };
}
