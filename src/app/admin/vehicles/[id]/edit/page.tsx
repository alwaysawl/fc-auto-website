import Link from "next/link";
import { notFound } from "next/navigation";
import { dbGetVehicleById } from "@/lib/supabase/vehicle-queries";
import VehicleForm from "@/components/admin/VehicleForm";
import VehicleStatusBadge from "@/components/admin/VehicleStatusBadge";
import type { VehicleStatus } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `编辑车辆 ${id} | FC Auto Export 管理后台` };
}

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await dbGetVehicleById(id);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/admin/vehicles"
          className="text-slate-400 hover:text-[#1E293B] transition-colors"
          aria-label="返回车辆列表"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1E293B]">编辑车辆</h1>
            <VehicleStatusBadge status={(vehicle.status ?? "在售") as VehicleStatus} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-mono">{vehicle.id}</p>
        </div>
      </div>

      {/* Stock number chip */}
      <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-sm">
        <span className="text-slate-500">库存编号：</span>
        <span className="font-mono font-semibold text-[#1E293B]">{vehicle.id}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-600">{vehicle.brand} {vehicle.model} {vehicle.year}</span>
      </div>

      <VehicleForm mode="edit" initial={vehicle} />
    </div>
  );
}
