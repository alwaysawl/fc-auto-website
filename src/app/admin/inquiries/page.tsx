import { listInquiries } from "@/lib/admin/inquiries/service";
import AdminInquiriesClient from "@/components/admin/AdminInquiriesClient";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  const initial = await listInquiries({
    sort: "attention",
    page: 1,
    pageSize: 20,
  });

  return <AdminInquiriesClient initial={initial} />;
}
