import { Locale, locales } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import HeaderWrapper from "@/components/HeaderWrapper";
import MainWrapper from "@/components/MainWrapper";
import Footer from "@/components/Footer";
import LocaleDocumentSync from "@/components/LocaleDocumentSync";
import { CartProvider } from "@/components/CartProvider";
import CartToast from "@/components/CartToast";
import FloatingActionStack from "@/components/FloatingActionStack";
import JsonLd from "@/components/JsonLd";
import AnalyticsPageTracker from "@/components/AnalyticsPageTracker";
import { organizationJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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
      <JsonLd data={organizationJsonLd()} />
      <LocaleDocumentSync locale={locale} />
      <AnalyticsPageTracker locale={locale} />
      <HeaderWrapper locale={locale} t={t} />
      <MainWrapper locale={locale}>{children}</MainWrapper>
      <Footer locale={locale} t={t} />
      <FloatingActionStack />
      <CartToast />
    </CartProvider>
  );
}
