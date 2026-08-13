import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, Locale } from "@/lib/types";

const PERMANENT = 308;

function withLocaleHeader(response: NextResponse, locale: string) {
  response.headers.set("x-locale", locale);
  return response;
}

function permanentRedirect(url: URL, locale: string) {
  return withLocaleHeader(NextResponse.redirect(url, PERMANENT), locale);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // Canonical host: apex only (production)
  if (host === "www.fcautoexport.com") {
    const url = request.nextUrl.clone();
    url.host = "fcautoexport.com";
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // /en/ → /en (avoid duplicate locale home URLs)
  for (const locale of locales) {
    if (pathname === `/${locale}/`) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}`;
      return permanentRedirect(url, locale);
    }
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const segment = pathname.split("/").filter(Boolean)[0] ?? defaultLocale;
    const locale = (locales.includes(segment as Locale)
      ? segment
      : defaultLocale) as string;
    // Avoid duplicate indexable URLs: /en/inventory/ vs /en/inventory
    if (pathname.length > 1 && pathname.endsWith("/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/\/+$/, "");
      return permanentRedirect(url, locale);
    }
    return withLocaleHeader(NextResponse.next(), locale);
  }

  const locale = defaultLocale;
  const url = request.nextUrl.clone();
  // Apex / must 308 to /en — never leave / and /en as duplicate indexable homes
  url.pathname =
    pathname === "/" || pathname === ""
      ? `/${locale}`
      : `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  return permanentRedirect(url, locale);
}

export const config = {
  matcher: ["/((?!api|admin|_next/static|_next/image|favicon.ico).*)"],
};
