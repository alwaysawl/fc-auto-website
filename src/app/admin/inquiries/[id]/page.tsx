import { notFound } from "next/navigation";
import { getInquiryDetail } from "@/lib/admin/inquiries/service";
import AdminInquiryDetailClient from "@/components/admin/AdminInquiryDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInquiryDetail(id);
  if (!result.inquiry) {
    notFound();
  }

  return (
    <AdminInquiryDetailClient
      initialInquiry={result.inquiry}
      initialActivities={result.activities}
    />
  );
}
