import Image from "next/image";
import Link from "next/link";
import {
  getDashboardInquiryStats,
  getDashboardRecentVehicles,
  getDashboardSalesTeam,
  getDashboardVehicleStats,
} from "@/lib/supabase/admin-queries";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import VehicleStatusBadge from "@/components/admin/VehicleStatusBadge";
import DashboardRefreshBar from "@/components/admin/DashboardRefreshBar";

// ─── Dev Warning Banner ───────────────────────────────────────────────────────
function DevWarningBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <svg className="mt-0.5 w-4 h-4 flex-shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        <strong>已登录：</strong>
        车辆 API 需要管理员会话。VIN 与内部备注不会通过公开接口返回。
      </span>
    </div>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <svg className="mt-0.5 w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
  live,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  icon: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
          accent ? "bg-[#FACC15]" : "bg-slate-100"
        }`}
      >
        <span className={accent ? "text-[#1E293B]" : "text-slate-500"}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-[#1E293B]">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        {live && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            实时数据
          </span>
        )}
      </div>
    </div>
  );
}

function SalesAgentCard({
  name,
  role,
  total,
  today,
  isActive,
}: {
  name: string;
  role: string;
  total: number;
  today: number;
  isActive: boolean;
}) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center flex-shrink-0">
          <span className="text-[#FACC15] font-bold text-sm">{initial}</span>
        </div>
        <div>
          <p className="font-semibold text-[#1E293B]">{name}</p>
          <p className="text-xs text-slate-500">{role}</p>
        </div>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${
            isActive
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-slate-500 bg-slate-50 border-slate-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {isActive ? "在线" : "离线"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
          <p className="text-xl font-bold text-[#1E293B]">{total}</p>
          <p className="text-xs text-slate-500 mt-0.5">累计分配</p>
        </div>
        <div className="rounded-lg bg-[#FACC15]/10 border border-[#FACC15]/30 p-3 text-center">
          <p className="text-xl font-bold text-[#1E293B]">{today}</p>
          <p className="text-xs text-slate-500 mt-0.5">今日</p>
        </div>
      </div>
    </div>
  );
}

function coverSrc(v: Vehicle): string {
  return v.mainImageUrl?.trim() || v.photos?.[0] || "/images/rav4.jpg";
}

function RecentVehiclesTable({
  vehicles,
  error,
}: {
  vehicles: Vehicle[];
  error?: string;
}) {
  if (error) return <div className="p-4"><SectionError message={error} /></div>;

  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">暂无车辆记录。</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {["主图", "库存编号", "品牌 / 车型", "年份", "价格", "状态", "更新时间", "操作"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vehicles.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-100">
                  <Image
                    src={coverSrc(v)}
                    alt={`${v.brand} ${v.model}`}
                    width={56}
                    height={40}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                {v.id}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-[#1E293B]">{v.brand}</p>
                <p className="text-xs text-slate-500">{v.model}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{v.year}</td>
              <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                ${v.fobPrice.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <VehicleStatusBadge status={(v.status ?? "在售") as VehicleStatus} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                {v.updatedAt
                  ? new Date(v.updatedAt).toLocaleString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5 flex-wrap">
                  <Link
                    href={`/admin/vehicles/${v.id}/edit`}
                    className="px-2 py-1 text-xs rounded-md bg-[#1E293B] text-white hover:bg-slate-700"
                  >
                    编辑
                  </Link>
                  <Link
                    href={`/en/inventory/${v.id}`}
                    target="_blank"
                    className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    查看前台
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentInquiriesTable({
  rows,
  error,
}: {
  rows: Awaited<ReturnType<typeof getDashboardInquiryStats>>["recentInquiries"];
  error?: string;
}) {
  if (error) return <div className="p-4"><SectionError message={error} /></div>;

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center px-4">
        <p className="text-sm text-slate-500">暂无询盘记录</p>
        <p className="text-xs text-slate-400 mt-1">
          No inquiry records yet. / Aucune demande pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {["询盘编号", "时间", "车辆", "来源", "负责人", "状态"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                {row.status === "已分配" ? (
                  row.inquiry_id
                ) : (
                  <Link
                    href={`/admin/inquiries/${row.id}`}
                    className="hover:underline text-[#1E293B] font-semibold"
                  >
                    {row.inquiry_id}
                  </Link>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {new Date(row.created_at).toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {row.vehicle_title ?? <span className="text-slate-400 italic">—</span>}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {row.source_page ?? <span className="text-slate-400 italic">—</span>}
              </td>
              <td className="px-4 py-3 font-medium text-[#1E293B]">
                {row.sales_agent_name ?? <span className="text-slate-400 italic">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {row.status ?? "已分配"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminDashboard() {
  const [vehicleStats, recentVehicles, inquiryStats, salesStats] =
    await Promise.all([
      getDashboardVehicleStats(),
      getDashboardRecentVehicles(5),
      getDashboardInquiryStats(),
      getDashboardSalesTeam(),
    ]);

  return (
    <div className="max-w-screen-xl">
      <DevWarningBanner />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">控制台</h1>
          <p className="text-sm text-slate-500 mt-1">FC Auto Export 运营概览</p>
        </div>
        <DashboardRefreshBar />
      </div>

      {/* Vehicle statistics */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">车辆统计</h2>
        {vehicleStats.error ? (
          <SectionError message={vehicleStats.error} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="车辆总数"
              value={vehicleStats.total}
              live
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <StatCard
              label="在售车辆"
              value={vehicleStats.onSale}
              accent
              live
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <StatCard label="草稿车辆" value={vehicleStats.draft} live icon={<span className="text-sm font-bold">草</span>} />
            <StatCard label="已售车辆" value={vehicleStats.sold} live icon={<span className="text-sm font-bold">售</span>} />
            <StatCard label="已下架" value={vehicleStats.delisted} live icon={<span className="text-sm font-bold">下</span>} />
            <StatCard label="推荐车辆" value={vehicleStats.featured} live icon={<span className="text-sm font-bold">荐</span>} />
          </div>
        )}
      </div>

      {/* Inquiry + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-[#1E293B]">询盘统计</h2>
          {inquiryStats.error ? (
            <SectionError message={inquiryStats.error} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatCard
                label="询盘总数"
                value={inquiryStats.totalInquiries}
                live
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                }
              />
              <StatCard
                label="今日询盘"
                value={inquiryStats.todayInquiries}
                live
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-3">快捷操作</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "新增询盘", href: "/admin/inquiries/new", icon: "➕" },
              { label: "全部车辆", href: "/admin/vehicles", icon: "🚗" },
              { label: "全部询盘", href: "/admin/inquiries", icon: "💬" },
              { label: "销售团队", href: "/admin/sales", icon: "👥" },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-[#FACC15] hover:shadow-md transition-all text-center"
              >
                <span className="text-xl">{a.icon}</span>
                <p className="mt-1.5 text-xs font-semibold text-[#1E293B]">{a.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sales team */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#1E293B] mb-3">销售团队</h2>
        {salesStats.error ? (
          <SectionError message={salesStats.error} />
        ) : salesStats.team.length === 0 ? (
          <p className="text-sm text-slate-500">暂无销售顾问数据。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {salesStats.team.map((member) => (
              <SalesAgentCard
                key={member.name}
                name={member.name}
                role={member.role}
                total={member.total}
                today={member.today}
                isActive={member.isActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent vehicles */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1E293B]">最近车辆</h2>
          <Link href="/admin/vehicles" className="text-xs font-semibold text-slate-500 hover:text-[#1E293B]">
            查看全部 →
          </Link>
        </div>
        <RecentVehiclesTable
          vehicles={recentVehicles.vehicles}
          error={recentVehicles.error}
        />
      </div>

      {/* Recent inquiries */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1E293B]">最近询盘</h2>
          <span className="text-xs text-slate-500">最近 10 条记录</span>
        </div>
        <div className="px-2 pb-2">
          <RecentInquiriesTable
            rows={inquiryStats.recentInquiries}
            error={inquiryStats.error}
          />
        </div>
      </div>
    </div>
  );
}
