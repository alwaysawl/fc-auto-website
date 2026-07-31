import { Suspense } from "react";
import { listInquiries } from "@/lib/admin/inquiries/service";
import AdminInquiriesClient from "@/components/admin/AdminInquiriesClient";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (key: string) => {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : null;
  };

  const initial = await listInquiries({
    sort: "attention",
    page: 1,
    pageSize: 20,
    assigned: pick("assigned"),
    status: pick("status"),
    followUp: pick("followUp"),
    priority: pick("priority"),
    source: pick("source"),
    q: pick("q"),
  });

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">加载中…</p>}>
      <AdminInquiriesClient initial={initial} />
    </Suspense>
  );
}
