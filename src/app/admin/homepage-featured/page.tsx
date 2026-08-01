import Link from "next/link";
import { dbGetHomepageFeaturedVehicles } from "@/lib/supabase/vehicle-queries";
import type { Vehicle } from "@/lib/types";
import HomepageFeaturedManager from "@/components/admin/HomepageFeaturedManager";
import AdminErrorState from "@/components/admin/AdminErrorState";
import { HOMEPAGE_SHOWCASE_LIMIT } from "@/lib/homepage-rank";

export const dynamic = "force-dynamic";

export default async function AdminHomepageFeaturedPage() {
  let vehicles: Vehicle[] = [];
  let loadError = false;

  try {
    vehicles = await dbGetHomepageFeaturedVehicles();
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div>
        <PageHeader count={0} />
        <AdminErrorState />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader count={vehicles.length} />
      <HomepageFeaturedManager initialVehicles={vehicles} />
    </div>
  );
}

function PageHeader({ count }: { count: number }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
          首页推荐管理
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          首页最多展示 {HOMEPAGE_SHOWCASE_LIMIT} 台 · 当前{" "}
          <strong className="text-[#1E293B]">{count}</strong> 台
        </p>
      </div>
      <Link
        href="/admin/vehicles"
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-[#1E293B] hover:bg-slate-50"
      >
        ← 车辆列表
      </Link>
    </div>
  );
}
