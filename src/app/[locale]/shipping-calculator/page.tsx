import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/** Standalone Freight Calculator page removed — keep URL and redirect home. */
export default async function ShippingCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  redirect(getLocalizedPath("/", localeParam as Locale));
}
