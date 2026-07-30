import "server-only";

import { getSupabaseAdmin } from "./admin";
import { dbGetAllVehicles } from "./vehicle-queries";
import type { Vehicle, VehicleStatus } from "@/lib/types";

export interface InquiryRow {
  id: string;
  inquiry_id: string;
  created_at: string;
  vehicle_title: string | null;
  source_page: string | null;
  sales_agent_name: string | null;
  status?: string | null;
}

export interface SalespersonCount {
  name: string;
  role: string;
  isActive: boolean;
  total: number;
  today: number;
}

export interface DashboardVehicleStats {
  total: number;
  onSale: number;
  draft: number;
  sold: number;
  delisted: number;
  featured: number;
  error?: string;
}

export interface DashboardInquiryStats {
  totalInquiries: number;
  todayInquiries: number;
  recentInquiries: InquiryRow[];
  /** true when public.inquiries is missing from schema */
  inquiriesTableMissing?: boolean;
  note?: string;
  error?: string;
}

export interface DashboardSalesStats {
  team: SalespersonCount[];
  error?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDashboardVehicleStats(): Promise<DashboardVehicleStats> {
  try {
    const vehicles = await dbGetAllVehicles();
    const counts: DashboardVehicleStats = {
      total: vehicles.length,
      onSale: 0,
      draft: 0,
      sold: 0,
      delisted: 0,
      featured: 0,
    };
    for (const v of vehicles) {
      const status = (v.status ?? "在售") as VehicleStatus;
      if (status === "在售") counts.onSale += 1;
      else if (status === "草稿") counts.draft += 1;
      else if (status === "已售") counts.sold += 1;
      else if (status === "已下架") counts.delisted += 1;
      if (v.featured) counts.featured += 1;
    }
    return counts;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getDashboardVehicleStats]", message);
    return {
      total: 0,
      onSale: 0,
      draft: 0,
      sold: 0,
      delisted: 0,
      featured: 0,
      error: `车辆统计加载失败：${message}`,
    };
  }
}

export async function getDashboardRecentVehicles(
  limit = 5
): Promise<{ vehicles: Vehicle[]; error?: string }> {
  try {
    const vehicles = await dbGetAllVehicles();
    // dbGetAllVehicles already orders by updated_at desc; tie-break created_at
    const sorted = [...vehicles].sort((a, b) => {
      const au = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bu = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      if (bu !== au) return bu - au;
      const ac = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bc = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bc - ac;
    });
    return { vehicles: sorted.slice(0, limit) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getDashboardRecentVehicles]", message);
    return { vehicles: [], error: `最近车辆加载失败：${message}` };
  }
}

/**
 * Prefer public.inquiries when present.
 * If the table is missing (PGRST205), return zeros + Chinese note — no throw.
 */
export async function getDashboardInquiryStats(): Promise<DashboardInquiryStats> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return {
      totalInquiries: 0,
      todayInquiries: 0,
      recentInquiries: [],
      error: "数据库配置错误。",
    };
  }

  const today = todayIso();

  try {
    const { count: totalCount, error: totalError } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      if (totalError.code === "PGRST205" || /Could not find the table/i.test(totalError.message)) {
        console.error("[getDashboardInquiryStats] inquiries missing:", totalError.message, totalError.code);
        return {
          totalInquiries: 0,
          todayInquiries: 0,
          recentInquiries: [],
          inquiriesTableMissing: true,
          note: "询盘数据库尚未启用",
        };
      }
      throw totalError;
    }

    const { count: todayCount, error: todayError } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`);

    if (todayError) throw todayError;

    const { data: recentRows, error: recentError } = await supabase
      .from("inquiries")
      .select(
        "id, inquiry_id, created_at, vehicle_title, source_page, assigned_to, status"
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    const recentInquiries: InquiryRow[] = (recentRows ?? []).map((row) => ({
      id: String(row.id),
      inquiry_id: String(row.inquiry_id ?? ""),
      created_at: String(row.created_at),
      vehicle_title: row.vehicle_title ?? null,
      source_page: row.source_page ?? null,
      sales_agent_name: row.assigned_to ?? null,
      status: row.status ?? null,
    }));

    return {
      totalInquiries: totalCount ?? 0,
      todayInquiries: todayCount ?? 0,
      recentInquiries,
    };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : err instanceof Error
        ? err.message
        : String(err);
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    console.error("[getDashboardInquiryStats]", message, code);
    return {
      totalInquiries: 0,
      todayInquiries: 0,
      recentInquiries: [],
      error: `询盘数据加载失败：${message}${code ? ` [code: ${code}]` : ""}`,
    };
  }
}

/** Live sales team from sales_agents + sales_assignments (does not change assignment logic). */
export async function getDashboardSalesTeam(): Promise<DashboardSalesStats> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return { team: [], error: "数据库配置错误。" };
  }

  try {
    const today = todayIso();

    const { data: agents, error: agentsError } = await supabase
      .from("sales_agents")
      .select("id, name, role, is_active, display_order")
      .order("display_order", { ascending: true });

    if (agentsError) throw agentsError;

    const { data: assignments, error: assignError } = await supabase
      .from("sales_assignments")
      .select("sales_agent_name, created_at");

    if (assignError) throw assignError;

    const personMap: Record<string, { total: number; today: number }> = {};
    for (const row of assignments ?? []) {
      const name: string = row.sales_agent_name ?? "Unknown";
      if (!personMap[name]) personMap[name] = { total: 0, today: 0 };
      personMap[name].total += 1;
      if (row.created_at && String(row.created_at).startsWith(today)) {
        personMap[name].today += 1;
      }
    }

    const team: SalespersonCount[] = (agents ?? []).map((agent) => {
      const counts = personMap[agent.name] ?? { total: 0, today: 0 };
      return {
        name: agent.name,
        role: agent.role || "销售顾问",
        isActive: !!agent.is_active,
        total: counts.total,
        today: counts.today,
      };
    });

    return { team };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : err instanceof Error
        ? err.message
        : String(err);
    console.error("[getDashboardSalesTeam]", message);
    return { team: [], error: `销售团队数据加载失败：${message}` };
  }
}
