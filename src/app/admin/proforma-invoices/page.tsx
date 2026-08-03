import { Suspense } from "react";
import { listProformaInvoices } from "@/lib/admin/proforma/service";
import AdminProformaInvoicesClient from "@/components/admin/AdminProformaInvoicesClient";

export const dynamic = "force-dynamic";

export default async function AdminProformaInvoicesPage() {
  const initial = await listProformaInvoices({
    sort: "newest",
    page: 1,
    pageSize: 20,
  });

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">加载中…</p>}>
      <AdminProformaInvoicesClient initial={initial} />
    </Suspense>
  );
}
