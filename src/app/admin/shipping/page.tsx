import AdminShippingEditor from "@/components/admin/AdminShippingEditor";

export default function AdminShippingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
        运费管理
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        编辑各车辆的阶梯运费价格。价格按数量区间查表，非逐台累加。
      </p>
      <AdminShippingEditor />
    </div>
  );
}
