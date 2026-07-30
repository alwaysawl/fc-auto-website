import { Locale } from "@/lib/types";
import { getTranslations } from "@/lib/translations";
import {
  dbGetPublicVehicleById,
  dbGetSimilarPublicVehicles,
} from "@/lib/supabase/vehicle-queries";
import VehicleDetailClient from "@/components/VehicleDetailClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocalizedPath } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, id } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);
  try {
    const vehicle = await dbGetPublicVehicleById(id);
    if (vehicle) {
      const name =
        vehicle.titleEn?.trim() || `${vehicle.brand} ${vehicle.model}`;
      return {
        title: `${name} | ${t.vehicleDetail.pageTitle}`,
        description: `${name} — ${t.inventory.fobChina}`,
      };
    }
  } catch {
    // fall through
  }
  return {
    title: t.vehicleDetail.pageTitle,
    description: t.seo.inventoryDescription,
  };
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  const locale = localeParam as Locale;
  const t = getTranslations(locale);

  let vehicle = null;
  let fetchError: string | null = null;

  try {
    vehicle = await dbGetPublicVehicleById(id);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    console.error("[VehicleDetailPage] Supabase fetch failed:", fetchError);
  }

  if (fetchError) {
    return (
      <div className="bg-white min-h-screen">
        <div className="container-max px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-red-600 text-sm mb-4">
            Failed to load vehicle. {fetchError}
          </p>
          <Link
            href={getLocalizedPath("/inventory", locale)}
            className="text-sm font-semibold text-brand-slate hover:underline"
          >
            ← {t.common.backToInventory}
          </Link>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    notFound();
  }

  let similarVehicles: Awaited<ReturnType<typeof dbGetSimilarPublicVehicles>> = [];
  try {
    similarVehicles = await dbGetSimilarPublicVehicles(vehicle, 3);
  } catch (err) {
    console.error(
      "[VehicleDetailPage] similar vehicles failed:",
      err instanceof Error ? err.message : err
    );
  }

  return (
    <VehicleDetailClient
      key={vehicle.id}
      vehicle={vehicle}
      similarVehicles={similarVehicles}
      locale={locale}
      t={t}
    />
  );
}
