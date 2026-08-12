import { Inter, Playfair_Display, Noto_Sans_SC } from "next/font/google";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { Locale, locales } from "@/lib/types";
import { getSiteUrl, htmlLang, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sc",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "FC Auto Export supplies quality used cars from China for overseas dealers and buyers.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const raw = headerStore.get("x-locale") ?? "en";
  const locale = (locales.includes(raw as Locale) ? raw : "en") as Locale;
  const lang = htmlLang(locale);

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${playfair.variable} ${notoSansSc.variable}${
        locale === "zh" ? " locale-zh" : ""
      }`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
