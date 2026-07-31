import AdminShippingEditor from "@/components/admin/AdminShippingEditor";
import { listShippingCountriesWithPorts } from "@/lib/shippingDestinations/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminShippingPage() {
  const initial = await listShippingCountriesWithPorts({ enabledOnly: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-2">运费管理</h1>
      <p className="text-slate-500 text-sm mb-8">
        选择国家 → 选择港口 → 设置运费 → 保存运费。运费与车型无关。
      </p>
      <AdminShippingEditor initial={initial} />
    </div>
  );
}
