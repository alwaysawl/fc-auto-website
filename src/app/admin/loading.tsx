export default function AdminDashboardLoading() {
  return (
    <div className="max-w-screen-xl animate-pulse">
      <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-64 bg-slate-100 rounded mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl" />
        ))}
      </div>
      <p className="text-sm text-slate-500">加载控制台数据…</p>
    </div>
  );
}
