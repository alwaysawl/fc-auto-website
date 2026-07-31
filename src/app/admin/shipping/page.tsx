import AdminShippingEditor from "@/components/admin/AdminShippingEditor";

export default function AdminShippingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-2">运费管理</h1>
      <p className="text-slate-500 text-sm mb-8">
        按国家 → 港口管理运费。运费与车型无关，仅按目的港与车辆数量计费。
      </p>
      <AdminShippingEditor />
    </div>
  );
}
