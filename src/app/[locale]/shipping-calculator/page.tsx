import { redirect } from "next/navigation";
import { Locale } from "@/lib/types";
import { getLocalizedPath } from "@/lib/i18n";

/** Standalone Freight Calculator page removed — keep URL and redirect home. */
export default async function ShippingCalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  redirect(getLocalizedPath("/", localeParam as Locale));
}
