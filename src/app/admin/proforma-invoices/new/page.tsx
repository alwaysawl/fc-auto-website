import { getProformaSettings } from "@/lib/admin/proforma/service";
import AdminProformaEditor from "@/components/admin/AdminProformaEditor";

export const dynamic = "force-dynamic";

export default async function AdminProformaNewPage() {
  const settings = await getProformaSettings();
  return <AdminProformaEditor mode="create" settings={settings} />;
}
