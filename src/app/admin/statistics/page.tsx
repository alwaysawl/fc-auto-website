import AdminStatisticsDashboard from "@/components/admin/AdminStatisticsDashboard";
import { getAdminStatistics } from "@/lib/admin/statistics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminStatisticsPage() {
  const initial = await getAdminStatistics({ preset: "30d" });

  return <AdminStatisticsDashboard initial={initial} />;
}
