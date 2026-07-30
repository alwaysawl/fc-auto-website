import { Locale, locales } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import HeaderWrapper from "@/components/HeaderWrapper";
import MainWrapper from "@/components/MainWrapper";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
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
    <>
      <HeaderWrapper locale={locale} t={t} />
      <MainWrapper locale={locale}>{children}</MainWrapper>
      <Footer locale={locale} t={t} />
      <WhatsAppButton />
    </>
  );
}
