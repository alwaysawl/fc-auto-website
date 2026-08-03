import { getProformaSettings } from "@/lib/admin/proforma/service";
import AdminProformaSettingsClient from "@/components/admin/AdminProformaSettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getProformaSettings();

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#1E293B]">系统设置</h1>
        <p className="mt-1 text-sm text-slate-500">
          管理形式发票的公司信息与受保护收款账户预设。
        </p>
      </div>
      <AdminProformaSettingsClient initial={settings} />
    </div>
  );
}
