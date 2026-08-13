import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import { dbGetPublicVehicles } from "@/lib/supabase/vehicle-queries";
import InventoryClient from "@/components/InventoryClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);
  // Query strings (?brand=) are client filters. Canonical stays the clean inventory URL.
  return buildPageMetadata({
    locale,
    path: "/inventory",
    title: t.seo.inventoryTitle,
    description: t.seo.inventoryDescription,
  });
}

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ brand?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { brand: initialBrand } = await searchParams;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);

  let vehicles: Awaited<ReturnType<typeof dbGetPublicVehicles>> = [];
  let error: string | null = null;

  try {
    vehicles = await dbGetPublicVehicles();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[InventoryPage] Supabase fetch failed:", message);
    error = message;
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Compact inventory banner */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="container-max px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-brand-slate tracking-tight mb-2">
            {t.inventory.title}
          </h1>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl">
            {t.inventory.subtitle}
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="container-max">
          <InventoryClient
            vehicles={vehicles}
            locale={locale}
            t={t}
            error={error}
            initialBrand={initialBrand}
          />
        </div>
      </section>
    </div>
  );
}
