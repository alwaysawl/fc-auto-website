import Link from "next/link";
import VehicleForm from "@/components/admin/VehicleForm";

export const metadata = {
  title: "添加车辆 | FC Auto Export 管理后台",
};

export default function NewVehiclePage() {
  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/vehicles"
          className="text-slate-400 hover:text-[#1E293B] transition-colors"
          aria-label="返回车辆列表"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">添加车辆</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            填写车辆信息，保存为草稿或直接发布上架
          </p>
        </div>
      </div>

      <VehicleForm mode="new" />
    </div>
  );
}
