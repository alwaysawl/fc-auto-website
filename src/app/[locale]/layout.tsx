import { Locale, locales } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import HeaderWrapper from "@/components/HeaderWrapper";
import MainWrapper from "@/components/MainWrapper";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import LocaleDocumentSync from "@/components/LocaleDocumentSync";
import { CartProvider } from "@/components/CartProvider";
import CartToast from "@/components/CartToast";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = (locales.includes(localeParam as Locale)
    ? localeParam
    : "en") as Locale;
  const t = getTranslations(locale);
  return {
    title: {
      default: t.seo.homeTitle,
      template: `%s | FC Auto Export`,
    },
    description: t.seo.homeDescription,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;

  if (!locales.includes(locale)) {
    notFound();
  }

  const t = getTranslations(locale);

  return (
    <CartProvider>
      <LocaleDocumentSync locale={locale} />
      <HeaderWrapper locale={locale} t={t} />
      <MainWrapper locale={locale}>{children}</MainWrapper>
      <Footer locale={locale} t={t} />
      <WhatsAppButton />
      <CartToast />
    </CartProvider>
  );
}
