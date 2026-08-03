import Link from "next/link";
import { notFound } from "next/navigation";
import { formatUsd } from "@/lib/admin/proforma/money";
import { PROFORMA_STATUS_LABELS } from "@/lib/admin/proforma/types";
import { getProformaInvoice } from "@/lib/admin/proforma/service";
import AdminProformaDetailClient from "@/components/admin/AdminProformaDetailClient";
import AdminProformaPreview from "@/components/admin/AdminProformaPreview";

export const dynamic = "force-dynamic";

export default async function AdminProformaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProformaInvoice(id);
  if (!result.ok) {
    if (result.error.includes("不存在")) notFound();
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {result.error}
      </div>
    );
  }

  const inv = result.invoice;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            {inv.invoiceNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {PROFORMA_STATUS_LABELS[inv.status]} · 总计{" "}
            {formatUsd(inv.totalUsd)} · {inv.salespersonName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/proforma-invoices/${inv.id}/edit`}
            className="inline-flex items-center rounded-lg bg-[#FACC15] px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:brightness-95"
          >
            编辑
          </Link>
          <AdminProformaDetailClient invoice={inv} />
          <Link
            href="/admin/proforma-invoices"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] hover:bg-slate-50"
          >
            返回列表
          </Link>
        </div>
      </div>

      <AdminProformaPreview
        model={{
          invoiceNumber: inv.invoiceNumber,
          contractNumber: inv.contractNumber || inv.invoiceNumber,
          offerDate: inv.offerDate,
          validityText: inv.validityText || "",
          customerName: inv.customerName,
          customerCompany: inv.customerCompany || "",
          customerCountry: inv.customerCountry || "",
          customerAddress: inv.customerAddress || "",
          customerWhatsapp: inv.customerWhatsapp || "",
          customerEmail: inv.customerEmail || "",
          destinationCountry: inv.destinationCountry || "",
          destinationPort: inv.destinationPort || "",
          salespersonName: inv.salespersonName,
          salespersonPhone: inv.salespersonPhone,
          salespersonEmail: inv.salespersonEmail,
          company: inv.companySnapshot,
          payment: inv.paymentSnapshot,
          items: inv.items.map((item) => ({
            brand: item.brand,
            model: item.model,
            year: item.year || "",
            colour: item.colour || "",
            vin: item.vin || "",
            unitPriceUsd: item.unitPriceUsd,
            quantity: item.quantity,
            totalUsd: item.totalUsd,
            note: item.note || "",
          })),
          charges: inv.charges.map((c) => ({
            nameZh: c.nameZh,
            nameEn: c.nameEn,
            amountUsd: c.amountUsd,
          })),
          vehicleSubtotalUsd: inv.vehicleSubtotalUsd,
          chargesTotalUsd: inv.chargesTotalUsd,
          totalUsd: inv.totalUsd,
          depositUsd: inv.depositUsd,
          balanceUsd: inv.balanceUsd,
          terms: inv.termsSnapshot,
          notes: inv.notes || "",
        }}
      />

      {result.activities.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-[#1E293B]">活动记录</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {result.activities.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-2">
                <span className="font-medium text-[#1E293B]">
                  {a.activityType}
                </span>
                <span>{a.note || `${a.oldValue ?? ""} → ${a.newValue ?? ""}`}</span>
                <span className="text-slate-400">{a.createdAt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
