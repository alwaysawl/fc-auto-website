import Link from "next/link";
import { notFound } from "next/navigation";
import { getProformaSettings, getProformaInvoice } from "@/lib/admin/proforma/service";
import AdminProformaEditor from "@/components/admin/AdminProformaEditor";

export const dynamic = "force-dynamic";

export default async function AdminProformaEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, settings] = await Promise.all([
    getProformaInvoice(id),
    getProformaSettings(),
  ]);

  if (!result.ok) {
    if (result.error.includes("不存在")) notFound();
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p>{result.error}</p>
        <Link
          href="/admin/proforma-invoices"
          className="mt-3 inline-flex text-[#1E293B] underline"
        >
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <AdminProformaEditor
      mode="edit"
      initial={result.invoice}
      settings={settings}
    />
  );
}
