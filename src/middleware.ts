import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, Locale } from "@/lib/types";

function withLocaleHeader(response: NextResponse, locale: string) {
  response.headers.set("x-locale", locale);
  return response;
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

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const segment = pathname.split("/").filter(Boolean)[0] ?? defaultLocale;
    const locale = (locales.includes(segment as Locale)
      ? segment
      : defaultLocale) as string;
    return withLocaleHeader(NextResponse.next(), locale);
  }

  const locale = defaultLocale;
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return withLocaleHeader(NextResponse.redirect(request.nextUrl), locale);
}

export const config = {
  matcher: ["/((?!api|admin|_next/static|_next/image|favicon.ico).*)"],
};
