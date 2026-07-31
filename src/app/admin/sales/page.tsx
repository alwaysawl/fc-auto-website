import { getSalesTeamDashboard } from "@/lib/admin/sales-team/service";
import AdminSalesTeamClient from "@/components/admin/AdminSalesTeamClient";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const initial = await getSalesTeamDashboard({ preset: "30d" });
  return <AdminSalesTeamClient initial={initial} />;
}
